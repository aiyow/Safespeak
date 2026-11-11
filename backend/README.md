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

Set JWT_SECRET in backend/.env to a random secret of at least 32 bytes to keep local sessions valid across backend restarts. Local development generates a signing key at startup when the setting is blank.

## Hosted configuration

Set `NODE_ENV=production`, `ENABLE_TEST_REGISTRATION=false`, and `CLIENT_URL` to the HTTPS site origin. Set JWT_SECRET to a random secret of at least 32 bytes and use the same value across backend processes. Use a separate database with accounts provisioned by the administrator. Serve the frontend build and proxy `/api` to Express on the same origin. Configure an SPA fallback to `index.html` for frontend routes. The optional `TRUST_LOOPBACK_PROXY=true` setting requires a loopback listener and a reverse proxy that replaces any incoming `X-Forwarded-For` header with the verified client address. Rate limits are held per Express process. Expired sessions are rejected immediately. The database owner can periodically remove expired rows from `public.auth_sessions`.


## FAQ Management and Audit Logs

Apply `database/003_faq_audit_permissions.sql` as the database owner before running the updated backend. It reuses the existing `faqs` and `audit_logs` tables and FAQ timestamp trigger. No records are seeded. Deploy the backend and frontend together. Development sessions are migrated to the root cookie path by `/api/v1/auth/me`; database session expiry remains unchanged.

Administrators create drafts, edit, publish, unpublish, and permanently delete FAQs. Every actual FAQ change and its audit records commit together. Audit Logs are administrator-only and retain before/after content after deletion. Students and personnel can search published FAQs in Help Desk. Notification and concern modules remain unchanged.

Run `npm.cmd run test:faqs` from backend. The database connection must have permission to create a temporary database and grant the existing `safespeak_app` role access within it. The test suite creates an isolated database with a `safespeak_faq_test_` name and drops only that generated database in its cleanup. It does not modify application data. `node scripts/test-faqs.mjs --preview` additionally exposes an isolated test API on loopback port 5001 for a frontend at localhost:5174; send a line on stdin to close it and remove the test database.

### Batch FAQ publishing

FAQ content uses an editable answer list. Add, edit, and remove actions stay in the administrator browser until **SAVE FAQ**. That button sends the entire list to `PUT /api/v1/admin/faqs` with the revision from `GET /api/v1/admin/faqs/workspace`. All retained answers are published; omitted existing records are deleted. The save and all audit entries commit atomically. A stale revision returns 409 without changing records. Reload saved FAQs to resolve a conflict (this discards local edits after confirmation). Unsaved edits survive switching admin sidebar sections but not signing out or closing/reloading the app; browser unload prompts warn about unsaved changes. The batch accepts up to 500 FAQs. Existing per-record APIs remain compatible, and their changes invalidate an older batch revision.
