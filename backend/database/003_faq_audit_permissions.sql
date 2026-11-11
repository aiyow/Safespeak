BEGIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO safespeak_app;
GRANT SELECT, INSERT ON public.audit_logs TO safespeak_app;
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM safespeak_app;
COMMIT;
