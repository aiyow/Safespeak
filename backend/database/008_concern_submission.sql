BEGIN;
ALTER TABLE public.concerns ADD COLUMN IF NOT EXISTS client_submission_id uuid, ADD COLUMN IF NOT EXISTS submission_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS concerns_student_submission_key ON public.concerns(student_id,client_submission_id);
GRANT SELECT(id,reference_no,student_id,category_id,status,created_at,client_submission_id,submission_hash),INSERT(student_id,category_id,title,description,status,is_anonymous,client_submission_id,submission_hash) ON public.concerns TO safespeak_app;
GRANT USAGE ON SEQUENCE public.concern_reference_seq TO safespeak_app;
GRANT SELECT,INSERT ON public.concern_attachments TO safespeak_app;
GRANT INSERT(concern_id,old_status,new_status,changed_by,reason) ON public.concern_status_history TO safespeak_app;
COMMIT;
