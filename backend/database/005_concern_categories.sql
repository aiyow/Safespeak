BEGIN;

INSERT INTO public.concern_categories (name, is_active)
VALUES
  ('Faculty', true),
  ('Student/s', true),
  ('Environment', true),
  ('Student Government', true),
  ('Outside the School Premises', true),
  ('Other', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- Retain old records and their IDs, but expose only the agreed category list.
UPDATE public.concern_categories
SET is_active = false
WHERE is_active AND name NOT IN (
  'Faculty', 'Student/s', 'Environment', 'Student Government',
  'Outside the School Premises', 'Other'
);

COMMIT;
