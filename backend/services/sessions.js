import { createHash, randomBytes } from 'node:crypto';
import { sessionDuration } from '../config/auth.js';
import { pool } from '../config/db.js';

function hashToken(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return createHash('sha256').update(token).digest();
}

export async function createSession(userId, previousToken) {
  const token = randomBytes(32).toString('base64url');
  await pool.query(
    `WITH previous_session AS (
       DELETE FROM public.auth_sessions WHERE token_hash = $1
     )
     INSERT INTO public.auth_sessions (token_hash, user_id, expires_at)
     VALUES ($2, $3, now() + $4 * interval '1 millisecond')`,
    [hashToken(previousToken), hashToken(token), userId, sessionDuration]
  );
  return token;
}

export async function getSessionUser(token) {
  const hash = hashToken(token);
  if (!hash) return null;

  const { rows: [user] } = await pool.query(
    `SELECT u.id, u.full_name AS "fullName", u.email, u.role
     FROM public.auth_sessions s
     JOIN public.users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.is_active`,
    [hash]
  );
  return user ?? null;
}

export async function revokeSession(token) {
  const hash = hashToken(token);
  if (hash) await pool.query('DELETE FROM public.auth_sessions WHERE token_hash = $1', [hash]);
}
