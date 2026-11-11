import { Router, json } from 'express';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
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
const accountDetails = login.extend({
  firstName: z.string().trim().min(1, 'Enter your first name.').max(70, 'First name must be at most 70 characters.'),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(70, 'Last name must be at most 70 characters.'),
  middleInitial: z.string().trim().regex(/^(?:\p{L}\.?)?$/u, 'Enter one letter for the middle initial.').default('')
    .transform(value => value.replace(/\.$/, '')),
  password: password.refine(value => [...value].length >= 12, {
    message: 'Use at least 12 characters for your password.'
  })
});
const registration = z.discriminatedUnion('role', [
  accountDetails.extend({
    role: z.literal('student'),
    course: z.enum(['BSIT', 'BSCS'], { error: 'Select BSIT or BSCS.' }),
    studentNumber: z.string({ error: 'Enter your student number.' }).trim().toUpperCase()
      .regex(/^\d{3}-\d{5}[A-Z]$/, 'Use the student number format 234-12345M.'),
    yearLevel: z.enum(['1', '2', '3', '4'], { error: 'Select your current year.' }).transform(Number),
    section: z.string({ error: 'Enter your section.' }).trim()
      .min(1, 'Enter your section.').max(30, 'Section must be at most 30 characters.')
  }),
  accountDetails.extend({ role: z.enum(['personnel', 'admin']) })
]);

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

const parseRegistrationForm = multer({
  limits: { fields: 10, fieldNameSize: 40, fieldSize: 1024, parts: 11 }
}).none();

function readRegistrationBody(req, res, next) {
  if (!req.is('multipart/form-data')) return requireJson(req, res, next);

  parseRegistrationForm(req, res, error => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code !== 'LIMIT_UNEXPECTED_FILE') {
      return res.status(413).json({ message: 'Registration form exceeds the allowed size.' });
    }
    res.status(400).json({ message: 'Send valid registration fields without file attachments.' });
  });
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
}, readRegistrationBody, async (req, res) => {
  const input = registration.safeParse(req.body);
  if (!input.success) {
    const issue = input.error.issues[0];
    const field = issue.path[0];
    let message = issue.message;
    if (field === 'email') message = 'Enter a valid email address.';
    if (field === 'role') message = 'Select an account role.';
    if (field === 'password') message = 'Use a password of at least 12 characters and at most 72 UTF-8 bytes.';
    if (!field) message = 'Check the registration form and try again.';
    return res.status(400).json({ message });
  }

  try {
    await createAccount(input.data);
    res.status(201).json({ message: 'Account created. You can now sign in.' });
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'users_email_lower_unique') {
      return res.status(409).json({ message: 'An account already exists for that email address.' });
    }
    if (error.code === '23505' && error.constraint === 'users_student_number_key') {
      return res.status(409).json({ message: 'An account already exists for that student number.' });
    }
    throw error;
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
  res.clearCookie(sessionCookie, { ...cookieOptions, path: '/api/v1/auth' });
  res.cookie(sessionCookie, token, { ...cookieOptions, maxAge: sessionDuration });
  res.json({ user });
});

router.get('/me', requireSession, (req, res) => {
  res.clearCookie(sessionCookie, { ...cookieOptions, path: '/api/v1/auth' });
  res.cookie(sessionCookie, req.cookies[sessionCookie], { ...cookieOptions, maxAge: sessionDuration });
  res.json({ user: req.user });
});

router.post('/logout', async (req, res) => {
  await revokeSession(req.cookies[sessionCookie]);
  res.clearCookie(sessionCookie, { ...cookieOptions, path: '/api/v1/auth' });
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
