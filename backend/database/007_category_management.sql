BEGIN;
ALTER TABLE public.concern_categories ADD COLUMN IF NOT EXISTS sort_order integer;
UPDATE public.concern_categories SET sort_order=CASE name WHEN 'Faculty' THEN 1 WHEN 'Student/s' THEN 2 WHEN 'Environment' THEN 3 WHEN 'Student Government' THEN 4 WHEN 'Outside the School Premises' THEN 5 WHEN 'Other' THEN 6 ELSE 7 END WHERE sort_order IS NULL;
ALTER TABLE public.concern_categories ALTER COLUMN sort_order SET DEFAULT 7;
ALTER TABLE public.concern_categories ALTER COLUMN sort_order SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS concern_categories_normalized_name_key ON public.concern_categories(lower(btrim(name)));
GRANT SELECT(sort_order,updated_at),INSERT(name,description,is_active,sort_order),UPDATE(name,description,is_active) ON public.concern_categories TO safespeak_app;
COMMIT;
