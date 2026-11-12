BEGIN;
CREATE TABLE IF NOT EXISTS public.concern_activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 concern_id uuid NOT NULL REFERENCES public.concerns(id) ON DELETE RESTRICT,
 actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 action text NOT NULL CHECK (action IN ('assigned','reassigned','category_changed')),
 details jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS concern_activity_timeline_idx ON public.concern_activity(concern_id,created_at,id);
CREATE OR REPLACE FUNCTION public.set_concern_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=GREATEST(clock_timestamp(),OLD.updated_at+interval '1 microsecond'); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS concerns_updated_at ON public.concerns;
CREATE TRIGGER concerns_updated_at BEFORE UPDATE ON public.concerns FOR EACH ROW EXECUTE FUNCTION public.set_concern_updated_at();
GRANT SELECT(id,reference_no,student_id,category_id,title,description,status,resolution_summary,resolved_at,closed_at,created_at,updated_at) ON public.concerns TO safespeak_app;
GRANT UPDATE(category_id,status,resolution_summary,resolved_at,closed_at,updated_at) ON public.concerns TO safespeak_app;
GRANT SELECT ON public.concern_assignments,public.concern_status_history,public.concern_messages,public.concern_activity TO safespeak_app;
GRANT INSERT(concern_id,assigned_to,assigned_by,note,assigned_at) ON public.concern_assignments TO safespeak_app;
GRANT UPDATE(ended_at) ON public.concern_assignments TO safespeak_app;
GRANT INSERT(concern_id,sender_id,message,visibility,created_at) ON public.concern_messages TO safespeak_app;
GRANT INSERT(concern_id,actor_user_id,action,details,created_at) ON public.concern_activity TO safespeak_app;
GRANT INSERT(created_at) ON public.concern_status_history TO safespeak_app;
COMMIT;
