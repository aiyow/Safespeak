import { sessionCookie } from '../config/auth.js';
import { getSessionUser } from '../services/sessions.js';

export async function requireSession(req, res, next) {
  const user = await getSessionUser(req.cookies[sessionCookie]);
  if (!user) return res.status(401).json({ message: 'Sign in to continue.' });

  req.user = user;
  next();
}
