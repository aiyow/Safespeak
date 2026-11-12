BEGIN;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_intake_coordinator boolean NOT NULL DEFAULT false;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.users'::regclass AND conname='users_coordinator_role_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_coordinator_role_check CHECK (NOT is_intake_coordinator OR role='personnel');
  END IF;
END $$;
GRANT SELECT(is_intake_coordinator),INSERT(is_intake_coordinator),UPDATE(is_intake_coordinator) ON public.users TO safespeak_app;
COMMIT;
