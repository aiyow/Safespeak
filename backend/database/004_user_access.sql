BEGIN;
CREATE TABLE IF NOT EXISTS public.personnel_category_access (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.concern_categories(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, category_id)
);
CREATE INDEX IF NOT EXISTS personnel_category_access_category_idx ON public.personnel_category_access(category_id);
GRANT SELECT(id,full_name,email,role,is_active,student_number,course,year_level,section,created_at,updated_at) ON public.users TO safespeak_app;
GRANT INSERT(is_active) ON public.users TO safespeak_app;
GRANT UPDATE(full_name,email,role,is_active,student_number,course,year_level,section) ON public.users TO safespeak_app;
GRANT SELECT,INSERT,DELETE ON public.personnel_category_access TO safespeak_app;
GRANT SELECT(id,category_id,status) ON public.concerns TO safespeak_app;
GRANT SELECT(concern_id,assigned_to,ended_at) ON public.concern_assignments TO safespeak_app;
COMMIT;
