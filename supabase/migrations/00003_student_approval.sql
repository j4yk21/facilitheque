-- ============================================================
-- BattleLearn: Student Approval System
-- ============================================================

-- -----------------------------------------------
-- 1. Add status column to classroom_students
-- -----------------------------------------------

ALTER TABLE public.classroom_students
  ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Backfill existing rows so current students are not broken
UPDATE public.classroom_students SET status = 'approved';

-- Index for filtering by status
CREATE INDEX idx_classroom_students_status ON public.classroom_students(status);

-- -----------------------------------------------
-- 2. RLS policy: Teachers can update student status
-- -----------------------------------------------

CREATE POLICY "Teachers can update students in their classrooms"
  ON public.classroom_students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_students.classroom_id
        AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_students.classroom_id
        AND c.teacher_id = auth.uid()
    )
  );
