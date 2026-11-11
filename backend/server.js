import app from './app.js';
import { pool } from './config/db.js';
import { host } from './config/auth.js';
import { once } from 'node:events';
const PORT = Number(process.env.PORT || 5000);
async function startServer() {
  try {
    await pool.query('SELECT 1');

    console.log('PostgreSQL connected successfully!');

    const server = app.listen(PORT, host);
    await once(server, 'listening');
    const displayHost = host === '127.0.0.1' || host === '::1' ? 'localhost' : host;
    const urlHost = displayHost.includes(':') ? `[${displayHost}]` : displayHost;
    console.log(`Server listening at http://${urlHost}:${server.address().port}/`);
  } catch (error) {
    console.error(
      'Server startup failed:',
      error.message
    );

    process.exit(1);
  }
}

startServer();
