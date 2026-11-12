import categoriesRouter from './routes/categories.js';
import concernsRouter from './routes/concerns.js';
import referralsNotificationsRouter from './routes/referrals-notifications.js';
import reportsProfileSettingsRouter from './routes/reports-profile-settings.js';

import { pool } from './config/db.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import usersRouter from './routes/users.js';
import faqRouter from './routes/faqs.js';
import { clientOrigin, trustLoopbackProxy } from './config/auth.js';
import authRouter from './routes/auth.js';

const app = express();

if (trustLoopbackProxy) app.set('trust proxy', 'loopback');
app.use(helmet());
app.use(cors({
  origin: clientOrigin
}));
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin/categories', categoriesRouter);
app.use('/api/v1/concerns', concernsRouter);
app.use('/api/v1', referralsNotificationsRouter);
app.use('/api/v1', reportsProfileSettingsRouter);
app.use('/api/v1', usersRouter);
app.use('/api/v1', faqRouter);
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
      `SELECT id, name, description, sort_order AS "sortOrder"
       FROM public.concern_categories
       WHERE is_active = TRUE
       ORDER BY sort_order, created_at, id`
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


