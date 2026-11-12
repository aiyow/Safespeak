# SafeSpeak Setup

For usage instructions after installation, open the [Word user manual](docs/USER_MANUAL.docx).

**Where to type commands:** open VS Code, select **File > Open Folder**, and open your `SafeSpeak` project folder. Select **Terminal > New Terminal** and choose **PowerShell**. Use this terminal for the `powershell` command blocks below. The project folder contains `backend`, `frontend`, and this README; its name may differ on your computer.

Commands such as `psql`, `pg_dump`, `git`, and `npm` go at the PowerShell prompt, for example `PS C:\...\SafeSpeak>`. SQL and `\i` commands go at the PostgreSQL prompt, such as `safespeak_db=#`, after you connect with `psql`. Do not type the prompt itself or the code-block backticks.

## 1. Install requirements

- [Node.js](https://nodejs.org/en/download) 22.14 or newer
- [PostgreSQL](https://www.postgresql.org/download/) 18, including `psql`
- [Git](https://git-scm.com/downloads)

Remember the `postgres` password you set during installation. Make sure PostgreSQL is running.

## 2. Clone the repository

For a new clone, open PowerShell in the parent folder where you want to store the project, then run:

```powershell
git clone https://github.com/aiyow/Safespeak.git SafeSpeak
cd SafeSpeak
```

In VS Code, select **File > Open Folder** and open the newly created `SafeSpeak` folder before continuing. Open **Terminal > New Terminal** there.

## 3. Create the database

In the VS Code PowerShell terminal, with your project folder open, connect to PostgreSQL:

```powershell
psql -h localhost -U postgres -d postgres -W
```

At `Password for user postgres:`, type the password you chose when installing PostgreSQL and press Enter. Password characters are not displayed. When the prompt changes to `postgres=#`, enter these commands **one at a time in the same terminal**:

```sql
CREATE DATABASE safespeak_db;
CREATE ROLE safespeak_app LOGIN;
\password safespeak_app
\q
```

After `\password safespeak_app`, enter a new application password twice when prompted. You will use it in step 5. `\q` exits PostgreSQL and returns to PowerShell. If the database or role already exists, skip its `CREATE` command.

## 4. Set up the tables

Back at the **PowerShell** prompt in your project folder, run this command. Do not enter it at `postgres=#`:

```powershell
psql -h localhost -U postgres -d safespeak_db -W -f backend/database/setup.sql
```

Enter the `postgres` password once. This runs the schema and permissions in order and stops if an error occurs. Use it only for a fresh, empty database after completing step 3.

## 5. Configure the backend

Copy `backend/.env.example` and rename the copy to `.env` inside the same folder. Set these values:

```dotenv
PORT=5000
HOST=127.0.0.1
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=safespeak_db
DB_USER=safespeak_app
DB_PASSWORD=your_safespeak_app_password

NODE_ENV=development
JWT_SECRET=
ENABLE_TEST_REGISTRATION=true
TRUST_LOOPBACK_PROXY=false
```

In the **PowerShell terminal**, generate a secret using this command. Paste its output after `JWT_SECRET=` in the `.env` file and save the file:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

No frontend `.env` is needed. Do not upload your backend `.env` to GitHub.

## 6. Start the backend

In the VS Code **PowerShell** terminal, starting in the project folder:

```powershell
cd backend
npm install
npm run dev
```

Keep this terminal open.

## 7. Start the frontend

Select **Terminal > New Terminal** to open a second **PowerShell** terminal. It should start in the project folder; if it starts inside `backend`, run `cd ..` first. Then run:

```powershell
cd frontend
npm install
npm run dev
```

Keep both terminals running. Open **[http://localhost:5173](http://localhost:5173)** in your browser.

## 8. Create an account

Open **[http://localhost:5173/register](http://localhost:5173/register)**. Choose a role and register using fictional details and a password of at least 12 characters. Then sign in.

There are no default accounts. To test another role, sign out and register a separate account.

## Updating an existing clone

Use these steps if you already installed an earlier version. You do not need to clone again or recreate your database.

### 1. Get the latest code

Open your existing project in VS Code. Stop both running servers with `Ctrl+C` in their terminals. Open a new **PowerShell** terminal in the project folder, then run:

```powershell
git status
git pull --ff-only
```

If Git reports local changes that prevent the update, commit them or save them with `git stash push -u` before pulling. Use `git stash pop` afterward to restore saved changes and resolve any conflicts. Keep your existing `backend/.env`, database password, and `JWT_SECRET`.

### 2. Install updated dependencies

In that same **PowerShell** terminal, in the project folder:

```powershell
npm install --prefix backend
npm install --prefix frontend
```

### 3. Update an existing database

In the **PowerShell** terminal, in the project folder, back up your database first. Enter the `postgres` password when prompted:

```powershell
pg_dump -h localhost -U postgres -d safespeak_db -W -Fc -f ../safespeak-before-update.dump
```

This saves the backup one folder above the project. In the **same PowerShell terminal**, connect to your existing database:

```powershell
psql -h localhost -U postgres -d safespeak_db -W -v ON_ERROR_STOP=1
```

Enter the `postgres` password. Wait until the prompt reads **`safespeak_db=#`**. The following lines belong **at this PostgreSQL prompt**, not in PowerShell, pgAdmin's Query Tool, or a `.sql` editor.

Run **only migrations you have not applied**, one line at a time, in this order. For the earliest working installation, start with the runtime grants and `002`. If you completed the previous README's setup through `003`, start with `004`. If you do not know the last applied migration, check your setup notes or ask the person who installed that database before continuing.

```sql
\i backend/database/auth_runtime_grants.sql
\i backend/database/002_registration_details.sql
\i backend/database/003_faq_audit_permissions.sql
\i backend/database/004_user_access.sql
\i backend/database/005_concern_categories.sql
\i backend/database/006_coordinator_access.sql
\i backend/database/007_category_management.sql
\i backend/database/008_concern_submission.sql
\i backend/database/009_category_deletion.sql
\i backend/database/010_concern_workflow.sql
\i backend/database/011_referrals_notifications.sql
\i backend/database/012_reports_profile_settings.sql
\q
```

Each successful file prints messages such as `GRANT`, `ALTER TABLE`, and `COMMIT`. If it prints `ERROR`, stop and fix that error before running the next line. Record the last successful migration for your next update. The final `\q` returns you to PowerShell.

Do not run `setup.sql` on an existing database or repeat `005` after customizing categories; it restores the initial six-category configuration.

### 4. Restart the system

At the **PowerShell** prompt in the project folder, start the backend:

```powershell
cd backend
npm run dev
```

Open a second **PowerShell** terminal in the project folder and start the frontend:

```powershell
cd frontend
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** and refresh the page. Existing accounts remain available.

## Quick fixes

- **`psql` or `pg_dump` not recognized:** in the current PowerShell terminal run `$env:Path += ';C:\Program Files\PostgreSQL\18\bin'`, then retry. Replace `18` if your installed PostgreSQL version differs. Repeat this step in a new terminal if needed.
- **`syntax error` near `psql` or `pg_dump`:** you entered a terminal command inside PostgreSQL. Type `\q`, then run that command at the PowerShell prompt.
- **SQL or `\i` is not recognized in PowerShell:** connect with the appropriate `psql` command first, then wait for `postgres=#` or `safespeak_db=#`.
- **SQL file not found:** run `\q`, make sure PowerShell is in the folder containing `backend` and `frontend`, then connect again.
- **PowerShell blocks `npm`:** use `npm.cmd install` and `npm.cmd run dev` instead.
- **Database connection fails:** check that PostgreSQL is running and that the database name and application password in `backend/.env` are correct.
- **Page cannot connect:** keep both servers running and use `http://localhost:5173` exactly.

For future runs, open both terminals again and run `npm run dev` inside each folder. Repeat `npm install` only after dependency changes. Press `Ctrl+C` in each terminal to stop.
