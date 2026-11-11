import { Router, json } from 'express';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { clientOrigin, cookieOptions, sessionCookie, sessionDuration, testRegistration } from '../config/auth.js';
import { requireSession } from '../middleware/session.js';
import { createAccount, verifyAccount } from '../services/accounts.js';
import { createSession, revokeSession } from '../services/sessions.js';

const roles = ['student', 'personnel', 'admin'];
const email = z.string().trim().toLowerCase().pipe(z.email().max(255));
const password = z.string().min(1).refine(value => Buffer.byteLength(value, 'utf8') <= 72, {
  message: 'Password must be at most 72 UTF-8 bytes.'
});
const login = z.strictObject({ email, password });
const registration = login.extend({
  fullName: z.string().trim().min(1).max(150),
  password: password.refine(value => [...value].length >= 12, {
    message: 'Use at least 12 characters for your password.'
  }),
  role: z.enum(roles)
});

function attemptLimit(limit, options = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in 15 minutes.' },
    ...options
  });
}

function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({ message: 'Use application/json for this request.' });
  }
  next();
}

function registrationEnabled(req) {
  return testRegistration && (req.socket.remoteAddress === '127.0.0.1' || req.socket.remoteAddress === '::1');
}

const router = Router();

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method === 'POST' && req.get('Origin') !== clientOrigin) {
    return res.status(403).json({ message: 'This request must come from the SafeSpeak site.' });
  }
  next();
});
router.use(cookieParser(), json({ limit: '8kb' }));

router.get('/registration', (req, res) => {
  res.json({ allowedRoles: registrationEnabled(req) ? roles : [] });
});

router.post('/register', attemptLimit(15), (req, res, next) => {
  if (!registrationEnabled(req)) {
    return res.status(403).json({ message: 'Registration is closed.' });
  }
  next();
}, requireJson, async (req, res) => {
  const input = registration.safeParse(req.body);
  if (!input.success) {
    const issue = input.error.issues[0];
    const message = issue.path[0] === 'password'
      ? 'Use a password of at least 12 characters and at most 72 UTF-8 bytes.'
      : 'Enter a valid name and email address, and select a role.';
    return res.status(400).json({ message });
  }

  try {
    await createAccount(input.data);
    res.status(201).json({ message: 'Account created. You can now sign in.' });
  } catch (error) {
    if (error.code !== '23505' || error.constraint !== 'users_email_lower_unique') throw error;
    res.status(409).json({ message: 'An account already exists for that email address.' });
  }
});

const invalidCredentials = { message: 'Email or password is incorrect.' };

router.post('/login', attemptLimit(30), requireJson, (req, res, next) => {
  const input = login.safeParse(req.body);
  if (!input.success) return res.status(401).json(invalidCredentials);
  res.locals.credentials = input.data;
  next();
}, attemptLimit(10, { keyGenerator: (_req, res) => res.locals.credentials.email }), async (req, res) => {
  const { email: address, password: secret } = res.locals.credentials;
  const user = await verifyAccount(address, secret);
  if (!user) return res.status(401).json(invalidCredentials);

  const token = await createSession(user.id, req.cookies[sessionCookie]);
  res.cookie(sessionCookie, token, { ...cookieOptions, maxAge: sessionDuration });
  res.json({ user });
});

router.get('/me', requireSession, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', async (req, res) => {
  await revokeSession(req.cookies[sessionCookie]);
  res.clearCookie(sessionCookie, cookieOptions).status(204).end();
});

router.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'The request is too large.' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON request.' });
  }
  console.error('Authentication request failed:', error.code ?? error.name);
  res.status(500).json({ message: 'SafeSpeak could not complete this request. Try again.' });
});

export default router;
