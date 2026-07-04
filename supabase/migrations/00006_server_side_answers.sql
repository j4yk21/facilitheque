-- ============================================================
-- BattleLearn: Server-side answer validation (Phase 3)
-- ============================================================
-- Until now the browser downloaded the solutions and told the server how
-- much damage it dealt. This migration moves the trust boundary:
--   1. session_answers records every submission exactly once
--      (UNIQUE session/student/question — no double damage, no retry).
--   2. submit_answer() validates the answer in SQL, computes damage/XP
--      with the authoritative formulas (type, difficulty, character
--      class, real team composition), applies them atomically and
--      levels the student up.
--   3. get_battle_questions() serves students a sanitized copy of the
--      questions: no correct_answer, ordering items pre-shuffled,
--      matching pairs decorrelated. The template SELECT policy that
--      leaked solutions to any session member is dropped.
-- deal_damage() (hardened in 00005) is kept for the transition and can
-- be dropped once every client uses submit_answer.

-- -----------------------------------------------
-- 1. session_answers
-- -----------------------------------------------

CREATE TABLE public.session_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL CHECK (question_index >= 0),
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  damage INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_answer_per_question
    UNIQUE (session_id, student_id, question_index)
);

CREATE INDEX idx_session_answers_session_id ON public.session_answers(session_id);
CREATE INDEX idx_session_answers_student_id ON public.session_answers(student_id);

ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;

-- Students see their own answers; the teacher sees the whole session.
-- No INSERT/UPDATE/DELETE policies: writes only happen inside
-- submit_answer (SECURITY DEFINER).
CREATE POLICY "Students can view own answers"
  ON public.session_answers FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view session answers"
  ON public.session_answers FOR SELECT
  USING (public.is_session_teacher(session_answers.session_id));

-- -----------------------------------------------
-- 2. Answer normalization and checking
-- -----------------------------------------------

-- French-friendly normalization: case, trim, common diacritics/ligatures.
CREATE OR REPLACE FUNCTION public.normalize_answer(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT translate(
    lower(btrim(coalesce(p_text, ''))),
    'àâäáãåéèêëíìîïóòôöõúùûüýÿçñœæ',
    'aaaaaaeeeeiiiiooooouuuuyycnoa'
  );
$$;

-- true_false answers come in several shapes ("True", "vrai", "F"...):
-- map both sides onto a neutral token before comparing.
CREATE OR REPLACE FUNCTION public.normalize_bool_answer(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN public.normalize_answer(p_text) IN ('true', 'vrai', 'v', 't') THEN 'true'
    WHEN public.normalize_answer(p_text) IN ('false', 'faux', 'f') THEN 'false'
    ELSE public.normalize_answer(p_text)
  END;
$$;

-- Mirrors src/lib/battle/check-answer.ts, plus accent normalization and
-- an optional accepted_answers[] list on text questions.
CREATE OR REPLACE FUNCTION public.check_answer_sql(v_question JSONB, p_answer TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_type TEXT := v_question->>'type';
  v_correct TEXT := v_question->>'correct_answer';
  v_items JSONB := coalesce(v_question->'items', '[]'::jsonb);
  v_pairs JSONB := coalesce(v_question->'pairs', '[]'::jsonb);
  v_accepted JSONB := v_question->'accepted_answers';
  v_submitted JSONB;
  v_distinct_terms INTEGER;
  i INTEGER;
  v_alt TEXT;
BEGIN
  IF v_type = 'ordering' THEN
    BEGIN
      v_submitted := p_answer::jsonb;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;

    IF jsonb_typeof(v_submitted) <> 'array'
       OR jsonb_array_length(v_submitted) <> jsonb_array_length(v_items) THEN
      RETURN false;
    END IF;

    FOR i IN 0..jsonb_array_length(v_items) - 1 LOOP
      IF btrim(coalesce(v_submitted->>i, '')) <> btrim(v_items->>i) THEN
        RETURN false;
      END IF;
    END LOOP;
    RETURN true;

  ELSIF v_type = 'matching' THEN
    BEGIN
      v_submitted := p_answer::jsonb;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;

    IF jsonb_typeof(v_submitted) <> 'array'
       OR jsonb_array_length(v_submitted) <> jsonb_array_length(v_pairs) THEN
      RETURN false;
    END IF;

    -- No duplicated terms (a repeated pair could otherwise pad the count)
    SELECT count(DISTINCT btrim(elem->>'term')) INTO v_distinct_terms
    FROM jsonb_array_elements(v_submitted) elem;
    IF v_distinct_terms <> jsonb_array_length(v_pairs) THEN
      RETURN false;
    END IF;

    FOR i IN 0..jsonb_array_length(v_submitted) - 1 LOOP
      IF NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_pairs) cp
        WHERE btrim(cp.value->>'term') = btrim(coalesce(v_submitted->i->>'term', ''))
          AND btrim(cp.value->>'definition') = btrim(coalesce(v_submitted->i->>'definition', ''))
      ) THEN
        RETURN false;
      END IF;
    END LOOP;
    RETURN true;

  ELSIF v_type = 'true_false' THEN
    RETURN public.normalize_bool_answer(p_answer) = public.normalize_bool_answer(v_correct);

  ELSE
    -- multiple_choice, short_answer, fill_blank
    IF public.normalize_answer(p_answer) = public.normalize_answer(v_correct) THEN
      RETURN true;
    END IF;

    IF v_accepted IS NOT NULL AND jsonb_typeof(v_accepted) = 'array' THEN
      FOR v_alt IN SELECT jsonb_array_elements_text(v_accepted) LOOP
        IF public.normalize_answer(p_answer) = public.normalize_answer(v_alt) THEN
          RETURN true;
        END IF;
      END LOOP;
    END IF;
    RETURN false;
  END IF;
END;
$$;

-- -----------------------------------------------
-- 3. submit_answer — the authoritative game loop
-- -----------------------------------------------
-- Mirrors calculateQuestionDamage/calculateXpReward
-- (src/lib/battle/calculate-battle-state.ts) and the character class
-- multipliers (src/lib/rpg/character-classes.ts).

CREATE OR REPLACE FUNCTION public.submit_answer(
  p_session_id UUID,
  p_question_index INTEGER,
  p_answer TEXT
)
RETURNS TABLE(
  is_correct BOOLEAN,
  already_answered BOOLEAN,
  damage INTEGER,
  xp INTEGER,
  new_boss_hp INTEGER,
  boss_defeated BOOLEAN,
  new_total_xp INTEGER,
  new_level INTEGER,
  leveled_up BOOLEAN,
  solution JSONB
) AS $$
DECLARE
  v_student UUID := auth.uid();
  v_class TEXT;
  v_status session_status;
  v_questions JSONB;
  v_question JSONB;
  v_qtype TEXT;
  v_difficulty INTEGER;
  v_is_correct BOOLEAN;
  v_solution JSONB;
  v_type_mult NUMERIC;
  v_diff_mult NUMERIC;
  v_class_dmg_mult NUMERIC;
  v_class_xp_mult NUMERIC;
  v_team_dmg NUMERIC;
  v_team_xp NUMERIC;
  v_team_mc NUMERIC;
  v_damage INTEGER := 0;
  v_xp INTEGER := 0;
  v_inserted INTEGER;
  v_existing RECORD;
  v_current_hp INTEGER;
  v_new_hp INTEGER;
  v_display_name TEXT;
  v_old_xp INTEGER;
  v_old_level INTEGER;
  v_new_total INTEGER;
  v_new_lvl INTEGER;
BEGIN
  IF v_student IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT sp.character_class::text INTO v_class
  FROM public.session_participants sp
  WHERE sp.session_id = p_session_id AND sp.student_id = v_student;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student is not a participant of this session';
  END IF;

  SELECT s.status, t.questions INTO v_status, v_questions
  FROM public.sessions s
  JOIN public.templates t ON t.id = s.template_id
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Session is not active';
  END IF;

  v_question := v_questions->p_question_index;
  IF v_question IS NULL THEN
    RAISE EXCEPTION 'Question not found';
  END IF;

  v_qtype := v_question->>'type';
  v_difficulty := coalesce((v_question->>'difficulty')::int, 2);
  v_is_correct := public.check_answer_sql(v_question, p_answer);

  -- The solution is only ever returned AFTER the answer is locked in.
  v_solution := CASE v_qtype
    WHEN 'ordering' THEN jsonb_build_object('items', v_question->'items')
    WHEN 'matching' THEN jsonb_build_object('pairs', v_question->'pairs')
    ELSE jsonb_build_object('correct_answer', v_question->'correct_answer')
  END;

  IF v_is_correct THEN
    v_type_mult := CASE v_qtype
      WHEN 'multiple_choice' THEN 1.0
      WHEN 'short_answer' THEN 1.3
      WHEN 'true_false' THEN 0.7
      WHEN 'ordering' THEN 1.5
      WHEN 'matching' THEN 1.3
      WHEN 'fill_blank' THEN 1.2
      ELSE 1.0
    END;
    v_diff_mult := CASE v_difficulty WHEN 1 THEN 0.8 WHEN 2 THEN 1.0 WHEN 3 THEN 1.4 ELSE 1.0 END;
    v_class_dmg_mult := CASE
      WHEN v_class = 'warrior' THEN 1.25
      WHEN v_class = 'mage' AND v_difficulty = 3 THEN 1.5
      WHEN v_class = 'scout' AND v_qtype = 'multiple_choice' THEN 1.3
      ELSE 1.0
    END;
    v_class_xp_mult := CASE WHEN v_class = 'healer' THEN 1.5 ELSE 1.0 END;

    SELECT
      1 + 0.05 * count(*) FILTER (WHERE sp.character_class = 'warrior'),
      1 + 0.10 * count(*) FILTER (WHERE sp.character_class = 'mage')
        + 0.15 * count(*) FILTER (WHERE sp.character_class = 'healer'),
      1 + 0.05 * count(*) FILTER (WHERE sp.character_class = 'scout')
    INTO v_team_dmg, v_team_xp, v_team_mc
    FROM public.session_participants sp
    WHERE sp.session_id = p_session_id;

    IF v_qtype <> 'multiple_choice' THEN
      v_team_mc := 1.0;
    END IF;

    v_damage := floor(10 * v_type_mult * v_diff_mult * v_class_dmg_mult * v_team_dmg * v_team_mc);
    v_xp := floor(v_damage * 1.5 * v_class_xp_mult * v_team_xp);
  END IF;

  -- One submission per question, ever. A second call returns the stored
  -- verdict and applies nothing.
  INSERT INTO public.session_answers
    (session_id, student_id, question_index, question_id, answer, is_correct, damage, xp)
  VALUES
    (p_session_id, v_student, p_question_index,
     coalesce(v_question->>'id', p_question_index::text),
     p_answer, v_is_correct, v_damage, v_xp)
  ON CONFLICT (session_id, student_id, question_index) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    SELECT sa.is_correct AS was_correct INTO v_existing
    FROM public.session_answers sa
    WHERE sa.session_id = p_session_id
      AND sa.student_id = v_student
      AND sa.question_index = p_question_index;

    SELECT st.current_boss_hp INTO v_current_hp
    FROM public.session_state st
    WHERE st.session_id = p_session_id;

    SELECT p.total_xp, p.level INTO v_old_xp, v_old_level
    FROM public.profiles p WHERE p.id = v_student;

    RETURN QUERY SELECT
      v_existing.was_correct, true, 0, 0,
      coalesce(v_current_hp, 0), false,
      v_old_xp, v_old_level, false, v_solution;
    RETURN;
  END IF;

  -- Progress moves forward regardless of correctness
  UPDATE public.session_participants sp
  SET current_question_index = GREATEST(sp.current_question_index, p_question_index + 1)
  WHERE sp.session_id = p_session_id AND sp.student_id = v_student;

  SELECT p.total_xp, p.level INTO v_old_xp, v_old_level
  FROM public.profiles p WHERE p.id = v_student;

  IF NOT v_is_correct THEN
    SELECT st.current_boss_hp INTO v_current_hp
    FROM public.session_state st
    WHERE st.session_id = p_session_id;

    RETURN QUERY SELECT
      false, false, 0, 0,
      coalesce(v_current_hp, 0), false,
      v_old_xp, v_old_level, false, v_solution;
    RETURN;
  END IF;

  -- Correct answer: apply damage atomically (same locking discipline as
  -- deal_damage)
  SELECT st.current_boss_hp INTO v_current_hp
  FROM public.session_state st
  WHERE st.session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session state not found';
  END IF;

  -- Boss already dead (teammate landed the killing blow first): record
  -- stands, no damage applied.
  IF v_current_hp <= 0 THEN
    RETURN QUERY SELECT
      true, false, 0, 0, 0, true,
      v_old_xp, v_old_level, false, v_solution;
    RETURN;
  END IF;

  v_new_hp := GREATEST(v_current_hp - v_damage, 0);

  SELECT p.display_name INTO v_display_name
  FROM public.profiles p WHERE p.id = v_student;

  UPDATE public.session_state st
  SET
    current_boss_hp = v_new_hp,
    logs = st.logs || jsonb_build_array(jsonb_build_object(
      'timestamp', now(),
      'student_id', v_student,
      'event', 'damage',
      'value', v_damage,
      'message', coalesce(v_display_name, 'Un joueur') || ' dealt ' || v_damage || ' damage!'
    )),
    updated_at = now()
  WHERE st.session_id = p_session_id;

  UPDATE public.session_participants sp
  SET damage_dealt = sp.damage_dealt + v_damage,
      xp_earned = sp.xp_earned + v_xp
  WHERE sp.session_id = p_session_id AND sp.student_id = v_student;

  v_new_total := v_old_xp + v_xp;
  v_new_lvl := floor(v_new_total / 500.0)::int + 1;

  UPDATE public.profiles p
  SET total_xp = v_new_total,
      level = v_new_lvl
  WHERE p.id = v_student;

  IF v_new_hp = 0 THEN
    UPDATE public.sessions s
    SET status = 'completed', completed_at = now()
    WHERE s.id = p_session_id;
  END IF;

  RETURN QUERY SELECT
    true, false, v_damage, v_xp,
    v_new_hp, (v_new_hp = 0),
    v_new_total, v_new_lvl, (v_new_lvl > v_old_level), v_solution;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.submit_answer(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_answer(UUID, INTEGER, TEXT) TO authenticated, service_role;

-- -----------------------------------------------
-- 4. get_battle_questions — sanitized questions for students
-- -----------------------------------------------

CREATE OR REPLACE FUNCTION public.get_battle_questions(p_session_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_boss_name TEXT;
  v_boss_avatar TEXT;
  v_questions JSONB;
  v_result JSONB := '[]'::jsonb;
  v_q JSONB;
  v_clean JSONB;
  v_terms TEXT[];
  v_defs TEXT[];
  v_pairs JSONB;
  i INTEGER;
  j INTEGER;
BEGIN
  IF NOT (public.is_session_teacher(p_session_id)
          OR public.is_session_participant(p_session_id)) THEN
    RAISE EXCEPTION 'Not a member of this session';
  END IF;

  SELECT t.boss_name, t.boss_avatar_id, t.questions
  INTO v_boss_name, v_boss_avatar, v_questions
  FROM public.sessions s
  JOIN public.templates t ON t.id = s.template_id
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  FOR i IN 0..jsonb_array_length(v_questions) - 1 LOOP
    v_q := v_questions->i;

    v_clean := jsonb_build_object(
      'id', v_q->'id',
      'type', v_q->'type',
      'text', v_q->'text',
      'difficulty', v_q->'difficulty',
      'correct_answer', ''
    );
    IF v_q ? 'time_limit_seconds' THEN
      v_clean := v_clean || jsonb_build_object('time_limit_seconds', v_q->'time_limit_seconds');
    END IF;

    IF v_q->>'type' = 'multiple_choice' THEN
      v_clean := v_clean || jsonb_build_object('options', v_q->'options');

    ELSIF v_q->>'type' = 'ordering' THEN
      -- Shuffle server-side: the authored order IS the solution.
      v_clean := v_clean || jsonb_build_object('items', (
        SELECT coalesce(jsonb_agg(value ORDER BY random()), '[]'::jsonb)
        FROM jsonb_array_elements(coalesce(v_q->'items', '[]'::jsonb))
      ));

    ELSIF v_q->>'type' = 'matching' THEN
      -- Decorrelate: terms keep their order, definitions are shuffled,
      -- so the returned pairs carry no mapping information.
      SELECT array_agg(value->>'term'), array_agg(value->>'definition' ORDER BY random())
      INTO v_terms, v_defs
      FROM jsonb_array_elements(coalesce(v_q->'pairs', '[]'::jsonb));

      v_pairs := '[]'::jsonb;
      IF v_terms IS NOT NULL THEN
        FOR j IN 1..array_length(v_terms, 1) LOOP
          v_pairs := v_pairs || jsonb_build_array(
            jsonb_build_object('term', v_terms[j], 'definition', v_defs[j])
          );
        END LOOP;
      END IF;
      v_clean := v_clean || jsonb_build_object('pairs', v_pairs);
    END IF;

    v_result := v_result || jsonb_build_array(v_clean);
  END LOOP;

  RETURN jsonb_build_object(
    'boss_name', v_boss_name,
    'boss_avatar_id', v_boss_avatar,
    'questions', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_battle_questions(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_battle_questions(UUID) TO authenticated, service_role;

-- -----------------------------------------------
-- 5. Stop shipping solutions to the browser
-- -----------------------------------------------
-- Students now get questions through get_battle_questions; only the
-- owning teacher reads templates directly.

DROP POLICY IF EXISTS "Anyone can view templates in active sessions" ON public.templates;
