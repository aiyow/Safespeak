# SafeSpeak frontend

Start with the [complete setup tutorial](../README.md) to initialize PostgreSQL, configure the backend, create test accounts, and run both servers.

From this folder, use `npm.cmd ci` and `npm.cmd run dev`, then open http://localhost:5173. The frontend forwards `/api` requests to Express at `127.0.0.1:5000`. No frontend `.env` is required for the default setup.

Use `npm.cmd run build` for a production build, and `npm.cmd run preview` to inspect it locally while the backend is running. On macOS/Linux, use `npm` instead of `npm.cmd`.
