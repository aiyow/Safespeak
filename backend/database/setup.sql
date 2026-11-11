-- Fresh, empty database only. Create safespeak_db and safespeak_app first.
-- Relative includes resolve from this file, regardless of the terminal directory.
\set ON_ERROR_STOP on
\ir 000_initial_schema.sql
\ir 001_auth_sessions.sql
\ir auth_runtime_grants.sql
\ir 002_registration_details.sql
\ir 003_faq_audit_permissions.sql
