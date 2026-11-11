BEGIN;

GRANT USAGE ON SCHEMA public TO safespeak_app;
GRANT SELECT (id, full_name, email, password_hash, role, is_active),
  INSERT (full_name, email, password_hash, role)
  ON public.users TO safespeak_app;
GRANT SELECT, INSERT, DELETE ON public.auth_sessions TO safespeak_app;
GRANT SELECT (id, name, description, is_active) ON public.concern_categories TO safespeak_app;

COMMIT;
