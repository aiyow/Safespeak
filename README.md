# SafeSpeak Setup

## 1. Install requirements

- [Node.js](https://nodejs.org/en/download) 22.14 or newer
- [PostgreSQL](https://www.postgresql.org/download/) 18, including `psql`
- [Git](https://git-scm.com/downloads)

Remember the `postgres` password you set during installation. Make sure PostgreSQL is running.

## 2. Clone the repository

Replace the URL with your group's repository URL:

```bash
git clone https://github.com/aiyow/Safespeak.git SafeSpeak
cd SafeSpeak
```

## 3. Create the database

Open a terminal and connect to PostgreSQL:

```bash
psql -h localhost -U postgres -d postgres -W
```

Enter your PostgreSQL password, then run:

```sql
CREATE DATABASE safespeak_db;
CREATE ROLE safespeak_app LOGIN;
\password safespeak_app
\q
```

Choose a password for `safespeak_app` when prompted. You will use it in step 5. If the database or role already exists, skip its `CREATE` command.

## 4. Set up the tables

From the `SafeSpeak` folder, run one command:

```bash
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

Generate a secret using this command and paste the output after `JWT_SECRET=`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

No frontend `.env` is needed. Do not upload your backend `.env` to GitHub.

## 6. Start the backend

Open a terminal in the `SafeSpeak` folder:

```bash
cd backend
npm install
npm run dev
```

Keep this terminal open.

## 7. Start the frontend

Open a second terminal in the `SafeSpeak` folder:

```bash
cd frontend
npm install
npm run dev
```

Keep both terminals running. Open **[http://localhost:5173](http://localhost:5173)** in your browser.

## 8. Create an account

Open **[http://localhost:5173/register](http://localhost:5173/register)**. Choose a role and register using fictional details and a password of at least 12 characters. Then sign in.

There are no default accounts. To test another role, sign out and register a separate account.

## Quick fixes

- **`psql` not recognized:** add `C:\Program Files\PostgreSQL\18\bin` to your PATH, then reopen your terminal.
- **PowerShell blocks `npm`:** use `npm.cmd install` and `npm.cmd run dev` instead.
- **Database connection fails:** check that PostgreSQL is running and that the database name and application password in `backend/.env` are correct.
- **Page cannot connect:** keep both servers running and use `http://localhost:5173` exactly.

For future runs, open both terminals again and run `npm run dev` inside each folder. Repeat `npm install` only after dependency changes. Press `Ctrl+C` in each terminal to stop.
