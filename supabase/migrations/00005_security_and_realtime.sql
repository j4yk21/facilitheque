-- ============================================================
-- BattleLearn: Security hardening & realtime publication
-- ============================================================
-- Fixes from the 2026-07-04 audit:
--   1. sessions / session_participants were never published to realtime,
--      so students stayed stuck in the lobby when the teacher pressed
--      "Start Battle" and the teacher's participant counter never moved.
--   2. deal_damage trusted the client for identity, damage and XP.
--   3. Students could promote themselves to teacher or edit their XP
--      through the unrestricted profiles UPDATE policy.
--   4. classrooms/sessions were enumerable by anyone (invite tokens and
--      battle codes leaked); students could self-approve into classrooms.
--   5. session_participants UPDATE was USING(false), silently discarding
--      every progress save; students could not see their teammates.

-- -----------------------------------------------
-- 1. Realtime publication
-- -----------------------------------------------

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------
-- 2. Protect privileged profile columns
-- -----------------------------------------------
-- The UPDATE policy lets users edit their own row, but role, XP, level
-- and HP must only change through trusted paths (SECURITY DEFINER
-- functions or the service role). RLS policies cannot compare OLD/NEW,
-- so a trigger enforces the column-level restriction.

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Trusted contexts: SECURITY DEFINER functions run as the function
  -- owner (postgres) and service-role REST requests run as service_role.
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.total_xp IS DISTINCT FROM OLD.total_xp
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.max_hp IS DISTINCT FROM OLD.max_hp THEN
    RAISE EXCEPTION 'role, total_xp, level and max_hp cannot be modified directly';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_columns ON public.profiles;
CREATE TRIGGER protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- -----------------------------------------------
-- 3. Harden deal_damage
-- -----------------------------------------------
-- Interim hardening until server-side answer validation (submit_answer)
-- replaces this function entirely:
--   - the caller can only deal damage as themselves,
--   - the caller must be a participant of the session,
--   - damage and XP are capped: the worst-case single question is ~75
--     damage / ~295 XP (35-student class stacking team bonuses), so
--     150/300 blocks one-shot cheating without false rejections,
--   - the log entry is built server-side from trusted values.

CREATE OR REPLACE FUNCTION public.deal_damage(
  p_session_id UUID,
  p_student_id UUID,
  p_damage INTEGER,
  p_xp_reward INTEGER,
  p_log_entry JSONB
)
RETURNS TABLE(new_boss_hp INTEGER, boss_defeated BOOLEAN) AS $$
DECLARE
  v_current_hp INTEGER;
  v_new_hp INTEGER;
  v_status session_status;
  v_display_name TEXT;
  v_is_service_role BOOLEAN;
BEGIN
  v_is_service_role := COALESCE(auth.jwt()->>'role', '') = 'service_role';

  -- Identity: students can only act as themselves
  IF NOT v_is_service_role AND (auth.uid() IS NULL OR auth.uid() <> p_student_id) THEN
    RAISE EXCEPTION 'Not authorized to deal damage for another student';
  END IF;

  -- Participation: the student must have joined this session
  IF NOT EXISTS (
    SELECT 1 FROM public.session_participants sp
    WHERE sp.session_id = p_session_id AND sp.student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'Student is not a participant of this session';
  END IF;

  -- Bounds
  IF p_damage < 0 OR p_damage > 150 OR p_xp_reward < 0 OR p_xp_reward > 300 THEN
    RAISE EXCEPTION 'Damage or XP out of allowed range';
  END IF;

  -- Lock the session_state row to prevent race conditions
  SELECT current_boss_hp INTO v_current_hp
  FROM public.session_state
  WHERE session_state.session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session state not found';
  END IF;

  -- Check session is active
  SELECT status INTO v_status
  FROM public.sessions
  WHERE sessions.id = p_session_id;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Session is not active';
  END IF;

  IF v_current_hp <= 0 THEN
    RAISE EXCEPTION 'Boss is already defeated';
  END IF;

  -- Calculate new HP (floor at 0)
  v_new_hp := GREATEST(v_current_hp - p_damage, 0);

  SELECT display_name INTO v_display_name
  FROM public.profiles
  WHERE profiles.id = p_student_id;

  -- Update session_state (triggers Realtime broadcast).
  -- The log entry is built here from trusted values; the client-supplied
  -- p_log_entry is intentionally ignored.
  UPDATE public.session_state
  SET
    current_boss_hp = v_new_hp,
    logs = logs || jsonb_build_array(jsonb_build_object(
      'timestamp', now(),
      'student_id', p_student_id,
      'event', 'damage',
      'value', p_damage,
      'message', COALESCE(v_display_name, 'Un joueur') || ' dealt ' || p_damage || ' damage!'
    )),
    updated_at = now()
  WHERE session_state.session_id = p_session_id;

  -- Update participant stats
  UPDATE public.session_participants
  SET
    damage_dealt = damage_dealt + p_damage,
    xp_earned = xp_earned + p_xp_reward
  WHERE session_participants.session_id = p_session_id
    AND session_participants.student_id = p_student_id;

  -- Update student total XP
  UPDATE public.profiles
  SET total_xp = total_xp + p_xp_reward
  WHERE profiles.id = p_student_id;

  -- If boss defeated, mark session completed
  IF v_new_hp = 0 THEN
    UPDATE public.sessions
    SET status = 'completed', completed_at = now()
    WHERE sessions.id = p_session_id;
  END IF;

  RETURN QUERY SELECT v_new_hp, (v_new_hp = 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.deal_damage(UUID, UUID, INTEGER, INTEGER, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deal_damage(UUID, UUID, INTEGER, INTEGER, JSONB) TO authenticated, service_role;

-- -----------------------------------------------
-- 4. session_participants: team visibility + progress persistence
-- -----------------------------------------------

-- Helper to avoid infinite RLS recursion when a session_participants
-- policy needs to look up the caller's own participation.
CREATE OR REPLACE FUNCTION public.is_session_participant(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.session_participants
    WHERE session_id = p_session_id AND student_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_session_participant(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_session_participant(UUID) TO authenticated, service_role;

-- Students could only see their own row: the isometric scene, the team
-- counter and team bonuses were blind to teammates.
DROP POLICY IF EXISTS "Participants can view their session" ON public.session_participants;
CREATE POLICY "Session members can view participants"
  ON public.session_participants FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_participants.session_id
        AND s.teacher_id = auth.uid()
    )
    OR public.is_session_participant(session_participants.session_id)
  );

-- USING(false) silently discarded every current_question_index save,
-- causing re-answered questions and double-counted damage after a
-- refresh. Students may now update their own row; a trigger keeps the
-- stat columns out of reach.
DROP POLICY IF EXISTS "Only system can update participants" ON public.session_participants;
CREATE POLICY "Students can update own participation"
  ON public.session_participants FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_participant_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.damage_dealt IS DISTINCT FROM OLD.damage_dealt
     OR NEW.xp_earned IS DISTINCT FROM OLD.xp_earned
     OR NEW.session_id IS DISTINCT FROM OLD.session_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.character_class IS DISTINCT FROM OLD.character_class THEN
    RAISE EXCEPTION 'Only progress can be updated directly';
  END IF;

  -- Progress can only move forward (blocks re-farming earlier questions)
  IF NEW.current_question_index < OLD.current_question_index THEN
    RAISE EXCEPTION 'Progress cannot move backwards';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_participant_columns ON public.session_participants;
CREATE TRIGGER protect_participant_columns
  BEFORE UPDATE ON public.session_participants
  FOR EACH ROW EXECUTE FUNCTION public.protect_participant_columns();

-- -----------------------------------------------
-- 5. Stop classroom / session enumeration
-- -----------------------------------------------

-- classrooms USING(true) exposed every invite_token to any logged-in
-- user. Lookup now goes through an RPC that requires knowing the token.
DROP POLICY IF EXISTS "Anyone can view classroom by invite token" ON public.classrooms;

CREATE OR REPLACE FUNCTION public.get_classroom_by_token(p_token TEXT)
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.name
  FROM public.classrooms c
  WHERE c.invite_token = p_token;
$$;

REVOKE EXECUTE ON FUNCTION public.get_classroom_by_token(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_classroom_by_token(TEXT) TO authenticated, service_role;

-- sessions "OR status = 'waiting'" exposed every waiting session (and
-- its battle_code) to every student. Lookup now requires the exact code.
DROP POLICY IF EXISTS "Students can view sessions they participate in" ON public.sessions;
CREATE POLICY "Students can view sessions they participate in"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = sessions.id
        AND sp.student_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.get_session_by_battle_code(p_battle_code TEXT)
RETURNS TABLE(
  id UUID,
  template_id UUID,
  teacher_id UUID,
  battle_code CHAR(6),
  expected_student_count INTEGER,
  status session_status,
  current_boss_hp INTEGER,
  max_boss_hp INTEGER
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    s.id, s.template_id, s.teacher_id, s.battle_code,
    s.expected_student_count, s.status,
    st.current_boss_hp, st.max_boss_hp
  FROM public.sessions s
  LEFT JOIN public.session_state st ON st.session_id = s.id
  WHERE s.battle_code = upper(p_battle_code)
    AND s.status IN ('waiting', 'active');
$$;

REVOKE EXECUTE ON FUNCTION public.get_session_by_battle_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_session_by_battle_code(TEXT) TO authenticated, service_role;

-- Students could INSERT themselves directly as approved members.
DROP POLICY IF EXISTS "Students can join classrooms" ON public.classroom_students;
CREATE POLICY "Students can request to join classrooms"
  ON public.classroom_students FOR INSERT
  WITH CHECK (auth.uid() = student_id AND status = 'pending');
