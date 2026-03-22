-- ============================================================
-- BattleLearn: Initial Schema
-- ============================================================

-- -----------------------------------------------
-- 1. Custom Enum Types
-- -----------------------------------------------

CREATE TYPE user_role AS ENUM ('teacher', 'student');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'short_answer');
CREATE TYPE session_status AS ENUM ('waiting', 'active', 'paused', 'completed');

-- -----------------------------------------------
-- 2. Tables
-- -----------------------------------------------

-- Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  max_hp INTEGER NOT NULL DEFAULT 100,
  avatar_url TEXT,
  dyslexia_font_enabled BOOLEAN NOT NULL DEFAULT false,
  high_contrast_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates (teacher-authored quiz content)
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  boss_name TEXT NOT NULL,
  boss_avatar_id TEXT NOT NULL DEFAULT 'default_boss',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT questions_is_array CHECK (jsonb_typeof(questions) = 'array'),
  CONSTRAINT questions_not_empty CHECK (jsonb_array_length(questions) > 0)
);

-- Sessions (live game instances)
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE RESTRICT,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  battle_code CHAR(6) NOT NULL UNIQUE,
  expected_student_count INTEGER NOT NULL CHECK (expected_student_count > 0),
  status session_status NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Session Participants (which students joined)
CREATE TABLE public.session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  damage_dealt INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_student_per_session UNIQUE (session_id, student_id)
);

-- Session State (real-time boss state — subscribed via Supabase Realtime)
CREATE TABLE public.session_state (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  current_boss_hp INTEGER NOT NULL,
  max_boss_hp INTEGER NOT NULL,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------
-- 3. Indexes
-- -----------------------------------------------

CREATE INDEX idx_templates_teacher_id ON public.templates(teacher_id);
CREATE INDEX idx_sessions_teacher_id ON public.sessions(teacher_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_session_participants_session_id ON public.session_participants(session_id);
CREATE INDEX idx_session_participants_student_id ON public.session_participants(student_id);

-- -----------------------------------------------
-- 4. Realtime
-- -----------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_state;

-- -----------------------------------------------
-- 5. Utility Functions
-- -----------------------------------------------

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Anonymous'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generate battle code (ambiguity-free charset: no 0/O, 1/I/L)
CREATE OR REPLACE FUNCTION public.generate_battle_code()
RETURNS CHAR(6) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------
-- 6. Atomic Damage Function (CRITICAL)
-- -----------------------------------------------
-- Uses FOR UPDATE row lock to prevent race conditions.
-- Runs as SECURITY DEFINER so students can't directly UPDATE session_state.

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
BEGIN
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

  -- Update session_state (triggers Realtime broadcast)
  UPDATE public.session_state
  SET
    current_boss_hp = v_new_hp,
    logs = logs || jsonb_build_array(p_log_entry),
    updated_at = now()
  WHERE session_state.session_id = p_session_id;

  -- Update participant stats
  UPDATE public.session_participants
  SET
    damage_dealt = damage_dealt + p_damage,
    xp_earned = xp_earned + p_xp_reward
  WHERE session_participants.session_id = p_session_id
    AND session_participants.student_id = p_student_id;

  -- Update student total XP and level
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------
-- 7. Row Level Security
-- -----------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_state ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view any profile"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- TEMPLATES
CREATE POLICY "Teachers can CRUD own templates"
  ON public.templates FOR ALL
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Anyone can view templates in active sessions"
  ON public.templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.template_id = templates.id
        AND s.status IN ('waiting', 'active')
    )
  );

-- SESSIONS
CREATE POLICY "Teachers can manage own sessions"
  ON public.sessions FOR ALL
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can view sessions they participate in"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = sessions.id
        AND sp.student_id = auth.uid()
    )
    OR status = 'waiting'
  );

-- SESSION_PARTICIPANTS
CREATE POLICY "Students can join sessions"
  ON public.session_participants FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Participants can view their session"
  ON public.session_participants FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_participants.session_id
        AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Only system can update participants"
  ON public.session_participants FOR UPDATE
  USING (false);

-- SESSION_STATE
CREATE POLICY "Anyone in the session can view state"
  ON public.session_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_state.session_id
        AND (
          s.teacher_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.session_participants sp
            WHERE sp.session_id = s.id AND sp.student_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Only teachers can insert session_state"
  ON public.session_state FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_state.session_id AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Only system can update session_state"
  ON public.session_state FOR UPDATE
  USING (false);
