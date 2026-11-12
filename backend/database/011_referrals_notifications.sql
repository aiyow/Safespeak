BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.concern_referrals WHERE status='pending' GROUP BY concern_id HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Multiple pending referrals exist for a concern. Review those records before applying 011_referrals_notifications.sql; no records have been changed.';
 END IF;
END $$;
ALTER TABLE public.concern_referrals
 ADD COLUMN IF NOT EXISTS requested_assignment_id uuid REFERENCES public.concern_assignments(id) ON DELETE RESTRICT,
 ADD COLUMN IF NOT EXISTS requested_category_id uuid REFERENCES public.concern_categories(id) ON DELETE RESTRICT,
 ADD COLUMN IF NOT EXISTS decision_reason text;
ALTER TABLE public.concern_referrals DROP CONSTRAINT IF EXISTS concern_referrals_status_check;
ALTER TABLE public.concern_referrals ADD CONSTRAINT concern_referrals_status_check CHECK(status IN ('pending','accepted','declined','completed','cancelled'));
CREATE UNIQUE INDEX IF NOT EXISTS referral_one_pending ON public.concern_referrals(concern_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS referral_requester_date_idx ON public.concern_referrals(referred_by,created_at DESC,id);
CREATE OR REPLACE FUNCTION public.set_referral_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=GREATEST(clock_timestamp(),OLD.updated_at+interval '1 microsecond'); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS referrals_updated_at ON public.concern_referrals;
CREATE TRIGGER referrals_updated_at BEFORE UPDATE ON public.concern_referrals FOR EACH ROW EXECUTE FUNCTION public.set_referral_updated_at();
ALTER TABLE public.concern_activity DROP CONSTRAINT IF EXISTS concern_activity_action_check;
ALTER TABLE public.concern_activity ADD CONSTRAINT concern_activity_action_check CHECK(action IN ('assigned','reassigned','category_changed','referral_requested','referral_completed','referral_declined','referral_cancelled'));
ALTER TABLE public.notifications
 ADD COLUMN IF NOT EXISTS referral_id uuid REFERENCES public.concern_referrals(id) ON DELETE RESTRICT,
 ADD COLUMN IF NOT EXISTS source_event_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS notification_event_recipient_key ON public.notifications(source_event_id,user_id);
CREATE INDEX IF NOT EXISTS notifications_user_date_idx ON public.notifications(user_id,created_at DESC,id);
GRANT SELECT ON public.concern_referrals,public.notifications TO safespeak_app;
GRANT INSERT(concern_id,referred_by,referred_to,reason,requested_assignment_id,requested_category_id,created_at) ON public.concern_referrals TO safespeak_app;
GRANT UPDATE(status,reviewed_by,reviewed_at,decision_reason,updated_at) ON public.concern_referrals TO safespeak_app;
GRANT INSERT(user_id,concern_id,referral_id,type,message,source_event_id,created_at) ON public.notifications TO safespeak_app;
GRANT UPDATE(is_read) ON public.notifications TO safespeak_app;
COMMIT;
