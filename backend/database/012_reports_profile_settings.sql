BEGIN;
GRANT SELECT(created_at) ON public.concern_categories TO safespeak_app;
GRANT SELECT ON public.system_settings TO safespeak_app;
GRANT INSERT(key,value,updated_by),UPDATE(value,updated_by,updated_at) ON public.system_settings TO safespeak_app;
COMMIT;
