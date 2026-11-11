# SafeSpeak local setup

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

## Hosted configuration

Set `NODE_ENV=production`, `ENABLE_TEST_REGISTRATION=false`, and `CLIENT_URL` to the HTTPS site origin. Use a separate database with accounts provisioned by the administrator. Serve the frontend build and proxy `/api` to Express on the same origin. Configure an SPA fallback to `index.html` for frontend routes. The optional `TRUST_LOOPBACK_PROXY=true` setting requires a loopback listener and a reverse proxy that replaces any incoming `X-Forwarded-For` header with the verified client address. Rate limits are held per Express process. Expired sessions are rejected immediately. The database owner can periodically remove expired rows from `public.auth_sessions`.

