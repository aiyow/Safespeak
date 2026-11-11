
import { pool } from './config/db.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { once } from 'node:events';
import { clientOrigin, host, trustLoopbackProxy } from './config/auth.js';
import authRouter from './routes/auth.js';

const PORT = Number(process.env.PORT || 5000);
const app = express();

if (trustLoopbackProxy) app.set('trust proxy', 'loopback');
app.use(helmet());
app.use(cors({
  origin: clientOrigin
}));
app.use('/api/v1/auth', authRouter);
app.use(express.json());

// Test PostgreSQL connection
app.get('/api/v1/health', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT NOW() AS database_time'
    );

    res.json({
      success: true,
      message: 'Database connected!',
      databaseTime: result.rows[0].database_time
    });
  } catch (error) {
    console.error(error.message);

    res.status(503).json({
      success: false,
      message: 'Database connection failed'
    });
  }
});

// Retrieve active concern categories
app.get('/api/v1/categories', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description
       FROM public.concern_categories
       WHERE is_active = TRUE
       ORDER BY name`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      success: false,
      message: 'Could not retrieve categories'
    });
  }
});

export default app;


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
