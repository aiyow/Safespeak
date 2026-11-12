-- Fresh, empty database only. Create safespeak_db and safespeak_app first.
-- Relative includes resolve from this file, regardless of the terminal directory.
\set ON_ERROR_STOP on
\ir 000_initial_schema.sql
\ir 001_auth_sessions.sql
\ir auth_runtime_grants.sql
\ir 002_registration_details.sql
\ir 003_faq_audit_permissions.sql
\ir 004_user_access.sql
\ir 005_concern_categories.sql
\ir 006_coordinator_access.sql
\ir 007_category_management.sql
\ir 008_concern_submission.sql
\ir 009_category_deletion.sql
\ir 010_concern_workflow.sql
\ir 011_referrals_notifications.sql
\ir 012_reports_profile_settings.sql
