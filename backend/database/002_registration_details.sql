BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS course varchar(4) CHECK (course IN ('BSIT', 'BSCS')),
  ADD COLUMN IF NOT EXISTS year_level smallint CHECK (year_level BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS section varchar(30);

GRANT INSERT (course, student_number, year_level, section)
  ON public.users TO safespeak_app;

COMMIT;
