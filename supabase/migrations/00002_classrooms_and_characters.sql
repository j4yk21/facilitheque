-- ============================================================
-- BattleLearn: Classrooms & Character Classes
-- ============================================================

-- -----------------------------------------------
-- 1. Character class enum
-- -----------------------------------------------

CREATE TYPE character_class AS ENUM ('warrior', 'mage', 'healer', 'scout');

-- Add character_class to profiles
ALTER TABLE public.profiles
  ADD COLUMN character_class character_class DEFAULT NULL;

-- Snapshot character_class into session_participants at join time
ALTER TABLE public.session_participants
  ADD COLUMN character_class character_class DEFAULT NULL;

-- -----------------------------------------------
-- 2. Classrooms
-- -----------------------------------------------

CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------
-- 3. Classroom students (many-to-many)
-- -----------------------------------------------

CREATE TABLE public.classroom_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_student_per_classroom UNIQUE (classroom_id, student_id)
);

-- -----------------------------------------------
-- 4. Groups within a classroom
-- -----------------------------------------------

CREATE TABLE public.classroom_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------
-- 5. Group members (many-to-many)
-- -----------------------------------------------

CREATE TABLE public.classroom_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.classroom_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  CONSTRAINT unique_student_per_group UNIQUE (group_id, student_id)
);

-- -----------------------------------------------
-- 6. Indexes
-- -----------------------------------------------

CREATE INDEX idx_classrooms_teacher_id ON public.classrooms(teacher_id);
CREATE INDEX idx_classrooms_invite_token ON public.classrooms(invite_token);
CREATE INDEX idx_classroom_students_classroom_id ON public.classroom_students(classroom_id);
CREATE INDEX idx_classroom_students_student_id ON public.classroom_students(student_id);
CREATE INDEX idx_classroom_groups_classroom_id ON public.classroom_groups(classroom_id);
CREATE INDEX idx_classroom_group_members_group_id ON public.classroom_group_members(group_id);
CREATE INDEX idx_classroom_group_members_student_id ON public.classroom_group_members(student_id);

-- -----------------------------------------------
-- 7. Row Level Security
-- -----------------------------------------------

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_group_members ENABLE ROW LEVEL SECURITY;

-- CLASSROOMS
CREATE POLICY "Teachers can CRUD own classrooms"
  ON public.classrooms FOR ALL
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can view classrooms they belong to"
  ON public.classrooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_students cs
      WHERE cs.classroom_id = classrooms.id
        AND cs.student_id = auth.uid()
    )
  );

-- Allow anyone to read a classroom by invite_token (for joining)
CREATE POLICY "Anyone can view classroom by invite token"
  ON public.classrooms FOR SELECT
  USING (true);

-- CLASSROOM_STUDENTS
CREATE POLICY "Students can join classrooms"
  ON public.classroom_students FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers and students can view classroom members"
  ON public.classroom_students FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_students.classroom_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can remove students from classrooms"
  ON public.classroom_students FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_students.classroom_id
        AND c.teacher_id = auth.uid()
    )
  );

-- CLASSROOM_GROUPS
CREATE POLICY "Teachers can CRUD groups in own classrooms"
  ON public.classroom_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_groups.classroom_id
        AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_groups.classroom_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view groups in their classrooms"
  ON public.classroom_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_students cs
      WHERE cs.classroom_id = classroom_groups.classroom_id
        AND cs.student_id = auth.uid()
    )
  );

-- CLASSROOM_GROUP_MEMBERS
CREATE POLICY "Teachers can manage group members"
  ON public.classroom_group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_groups g
      JOIN public.classrooms c ON c.id = g.classroom_id
      WHERE g.id = classroom_group_members.group_id
        AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classroom_groups g
      JOIN public.classrooms c ON c.id = g.classroom_id
      WHERE g.id = classroom_group_members.group_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their group memberships"
  ON public.classroom_group_members FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classroom_groups g
      JOIN public.classrooms c ON c.id = g.classroom_id
      WHERE g.id = classroom_group_members.group_id
        AND c.teacher_id = auth.uid()
    )
  );
