# SafeSpeak backend notes

For a fresh GitHub clone, follow the complete [root setup tutorial](../README.md), including the schema-only baseline and all migrations. The notes below also cover existing databases and hosted configuration.

Use the existing SafeSpeak PostgreSQL database with its `users` and `concern_categories` tables. Run the migration using a database administrator or schema owner. Replace the database and owner names in these PowerShell commands if your installation uses different ones.

```powershell
cd backend
psql -h localhost -U postgres -d safespeak_db -v ON_ERROR_STOP=1 -f database/001_auth_sessions.sql
psql -h localhost -U postgres -d safespeak_db
```

In the interactive `psql` session, create the runtime role once and set its password at the prompt.

```sql
CREATE ROLE safespeak_app LOGIN;
\password safespeak_app
\q
```

Apply the runtime permissions as the schema owner.

```powershell
psql -h localhost -U postgres -d safespeak_db -v ON_ERROR_STOP=1 -f database/auth_runtime_grants.sql
```

After applying the runtime grants, apply the registration migration with the schema owner. This adds course, year level, and section to the existing users table. The backend combines first name, middle initial, and last name into the existing full_name column. Existing accounts can continue to sign in.

```powershell
psql -h localhost -U postgres -d safespeak_db -v ON_ERROR_STOP=1 -f database/002_registration_details.sql
```

Copy `.env.example` to `.env` for a fresh checkout. Set `DB_USER=safespeak_app` and enter its password. Keep schema-owner credentials separate from the runtime environment.

## Run the test flow

In PowerShell, from `backend`:

```powershell
npm.cmd install
npm.cmd run dev
```

From `frontend` in a second PowerShell window:

```powershell
npm.cmd install
npm.cmd run dev
```

Open [http://localhost:5173/register](http://localhost:5173/register) and use a fictional name, unique email, and password of at least 12 characters. Create one account per role, then sign in with each account to open its dashboard. Vite forwards `/api` to Express at `127.0.0.1:5000`. If you change the backend port, set `SAFESPEAK_API_TARGET` in the frontend terminal. Keep `CLIENT_URL` equal to the exact origin you open in the browser.

`npm run dev` opens local signup for all three test roles. Local test signup requires `NODE_ENV=development`, a loopback listener, and a loopback frontend origin. To run locally with signup closed, use `npm start` with `ENABLE_TEST_REGISTRATION=false`.

Set JWT_SECRET in backend/.env to a random secret of at least 32 bytes and keep it unchanged to preserve local sessions across backend restarts. The backend loads this file using an explicit path, regardless of the terminal folder. Startup fails if the secret is missing instead of generating a temporary key. Existing process environment values take priority over the file. Sessions still expire after eight hours, and account access changes can revoke them.

Run `npm run test:sessions` to check signing-key persistence across separate Node processes and working folders, environment precedence, and missing-secret errors. It does not change your `.env` or application database.

## Hosted configuration

Set `NODE_ENV=production`, `ENABLE_TEST_REGISTRATION=false`, and `CLIENT_URL` to the HTTPS site origin. Set JWT_SECRET to a random secret of at least 32 bytes and use the same value across backend processes. Use a separate database with accounts provisioned by the administrator. Serve the frontend build and proxy `/api` to Express on the same origin. Configure an SPA fallback to `index.html` for frontend routes. The optional `TRUST_LOOPBACK_PROXY=true` setting requires a loopback listener and a reverse proxy that replaces any incoming `X-Forwarded-For` header with the verified client address. Rate limits are held per Express process. Expired sessions are rejected immediately. The database owner can periodically remove expired rows from `public.auth_sessions`.


## FAQ Management and Audit Logs

Apply `database/003_faq_audit_permissions.sql` as the database owner before running the updated backend. It reuses the existing `faqs` and `audit_logs` tables and FAQ timestamp trigger. No records are seeded. Deploy the backend and frontend together. Development sessions are migrated to the root cookie path by `/api/v1/auth/me`; database session expiry remains unchanged.

Administrators create drafts, edit, publish, unpublish, and permanently delete FAQs. Every actual FAQ change and its audit records commit together. Audit Logs are administrator-only and retain before/after content after deletion. Students and personnel can search published FAQs in Help Desk. Notification and concern modules remain unchanged.

Run `npm.cmd run test:faqs` from backend. The database connection must have permission to create a temporary database and grant the existing `safespeak_app` role access within it. The test suite creates an isolated database with a `safespeak_faq_test_` name and drops only that generated database in its cleanup. It does not modify application data. `node scripts/test-faqs.mjs --preview` additionally exposes an isolated test API on loopback port 5001 for a frontend at localhost:5174; send a line on stdin to close it and remove the test database.

### Batch FAQ publishing

FAQ content uses an editable answer list. Add, edit, and remove actions stay in the administrator browser until **SAVE FAQ**. That button sends the entire list to `PUT /api/v1/admin/faqs` with the revision from `GET /api/v1/admin/faqs/workspace`. All retained answers are published; omitted existing records are deleted. The save and all audit entries commit atomically. A stale revision returns 409 without changing records. Reload saved FAQs to resolve a conflict (this discards local edits after confirmation). Unsaved edits survive switching admin sidebar sections but not signing out or closing/reloading the app; browser unload prompts warn about unsaved changes. The batch accepts up to 500 FAQs. Existing per-record APIs remain compatible, and their changes invalidate an older batch revision.

## Users & access

Existing installations: apply `database/004_user_access.sql` as the database owner before starting the updated backend. Fresh installations already include it through `database/setup.sql`. No users or category grants are seeded. The migration adds personnel category grants and limited runtime permissions; audit history remains append-only.

Administrators can create accounts with initial passwords, edit details, configure personnel category scope, and activate/deactivate users. Access changes are audited and revoke the target user's sessions. Password resets and permanent user deletion are not included. Personnel access is the union of active category grants and explicit active assignments; concern workflows remain separate.

Run `npm run test:users` using the same separate administrator test connection as the FAQ test suite. It creates and removes an isolated `safespeak_users_test_` database. `node scripts/test-users.mjs --preview` exposes a loopback test API at port 5001 for a frontend at localhost:5174; send a line on stdin to stop and remove its database.

Existing installations: apply `database/005_concern_categories.sql` as the database owner to activate the agreed six concern categories and retire older category names without deleting their records. Fresh installations include this through `database/setup.sql`.

## Coordinator, categories, and student submission

Existing databases apply `006_coordinator_access.sql`, `007_category_management.sql`, and `008_concern_submission.sql` in order as the database owner. Fresh setup includes these through `database/setup.sql`. Coordinator permission starts disabled for existing personnel. Category grants now indicate assignment eligibility; regular personnel can read only explicitly assigned cases. An active Intake Coordinator can review all submitted concerns. Administrator status alone does not grant assignment or attachment-reading privileges.

Category Management supports adding, renaming, descriptions, and activation/deactivation. IDs and existing assignments survive these changes. Names are unique after trimming and case normalization. New categories appear after existing ones. Do not rerun the older category-seeding migration on an existing managed installation: it is intended for initial setup.

Student Submit Concern stores draft text only in the current browser, namespaced by account ID. No files or credentials are saved in draft storage. Reopened drafts require attachment reselection. Final submissions support three PDF/JPEG/PNG files up to 5 MB each, reference generation, initial status history, and metadata-only audit entries. A client submission ID prevents duplicate retries; changed content under the same ID is rejected.

`UPLOAD_DIR` defaults to `backend/storage/uploads`. Files are private and Git-ignored; downloads require owner, coordinator, or active-assignment authorization. Keep this directory on persistent private storage for any deployment. Database backups and attachment backups must be kept together. These initial local deployment steps do not configure hosted storage or malware scanning.

Workflow responsibility: coordinators review, request clarification through public replies, assign/reassign, reject initial submissions, approve referrals, and close resolved cases. Current handlers respond, request referrals, and resolve with a documented resolution. Status changes preserve history. Reopening remains outside this release. Submission does not automatically create an assignment.

Run `npm run test:submissions` with a separate administrator test connection. It creates and removes an isolated database plus a temporary private upload directory. Run `npm run test:drafts` from frontend for browser-storage checks. Existing FAQ/user regression scripts include the same new migrations. The optional submission test `--preview` runs on loopback port 5001 for frontend localhost:5174; send a line on stdin for cleanup.

Category deletion: existing installations apply `database/009_category_deletion.sql`; fresh setup includes it. Administrators confirm permanent deletion in the UI. The backend rejects deletion of categories used by concerns or personnel eligibility, checks the loaded revision, and commits deletion with a retained `category.deleted` audit snapshot. Deactivate in-use categories instead.

Concern workflow: existing installations next apply `database/010_concern_workflow.sql`; fresh setup includes it. Students view their own cases and public replies. Intake coordinators review, assign/reassign eligible personnel, correct compatible categories, reject initial submissions, and close resolved cases. Current handlers start work and resolve with a written summary. Internal notes and optional status-update notes stay private to personnel; resolution and rejection reasons remain student-visible. Completed conversations are read-only. Case audit snapshots contain metadata only. Run `npm run test:workflow` for isolated workflow, access, concurrency, rollback, and runtime-permission checks. No production records are seeded by the migration.

Referrals and notifications: after migration 010, existing installations apply `database/011_referrals_notifications.sql`; fresh setup includes it. Coordinators approve immediate handoffs to same-category eligible personnel. Pending requests are cancelled by resolution, manual reassignment, or category corrections. The bell and shared notification page use in-app delivery with a neutral unread badge and 30-second foreground refresh; no email or browser permissions are needed. Private referral reasons and internal notes never appear in notification text or administrator audit snapshots. Existing events are not backfilled. Run `npm run test:referrals` for the isolated combined concern/referral/notification suite; `node scripts/test-workflow.mjs --referrals --preview` starts a disposable preview API on port 5001 and removes its database/uploads after a line is sent on stdin. The migration refuses duplicate legacy pending requests without changing records.

Reports, Profile, and System Settings: existing installations next apply `database/012_reports_profile_settings.sql`; fresh setup includes it. Reports are administrator-only aggregates filtered by Manila submission dates, current status/category/handler, with paginated breakdowns and a live admin concern total. Every role can edit its own name and email in Profile; email changes require the current password, and student records/permissions remain administrator-managed. System Settings controls new submissions and authenticated Help Desk contact information. Missing settings default to open submissions and blank help fields; no configuration rows are seeded. Closure does not block existing cases, drafts, or exact submission retries. Saves check revisions and commit audit records atomically. Run `npm run test:modules` for the isolated combined suite, or add `--modules` to the referral preview command to inspect all modules without touching existing records. No new environment variables or dependencies are required.
