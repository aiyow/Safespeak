import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { sessionDuration, sessionSigningKey } from '../config/auth.js';
import { pool } from '../config/db.js';

const issuer = 'safespeak';
const audience = 'safespeak-session';
const algorithm = 'HS256';

function hashToken(token) {
  return createHash('sha256').update(token).digest();
}

function sessionHash(token) {
  if (typeof token !== 'string' || token.length > 1024) return null;

  // Existing opaque cookies remain usable while their stored sessions are active.
  if (/^[A-Za-z0-9_-]{43}$/.test(token)) return hashToken(token);

  try {
    jwt.verify(token, sessionSigningKey, {
      algorithms: [algorithm], issuer, audience, maxAge: sessionDuration / 1000
    });
    return hashToken(token);
  } catch (error) {
    if (!(error instanceof jwt.JsonWebTokenError)) throw error;
    return null;
  }
}

export async function createSession(userId, previousToken) {
  const token = jwt.sign({}, sessionSigningKey, {
    algorithm, issuer, audience,
    jwtid: randomBytes(32).toString('base64url'),
    expiresIn: sessionDuration / 1000
  });
  await pool.query(
    `WITH previous_session AS (
       DELETE FROM public.auth_sessions WHERE token_hash = $1
     )
     INSERT INTO public.auth_sessions (token_hash, user_id, expires_at)
     VALUES ($2, $3, now() + $4 * interval '1 millisecond')`,
    [sessionHash(previousToken), hashToken(token), userId, sessionDuration]
  );
  return token;
}

export async function getSessionUser(token) {
  const hash = sessionHash(token);
  if (!hash) return null;

  const { rows: [user] } = await pool.query(
    `SELECT u.id, u.full_name AS "fullName", u.email, u.role, u.is_intake_coordinator AS "isIntakeCoordinator"
     FROM public.auth_sessions s
     JOIN public.users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.is_active`,
    [hash]
  );
  return user ?? null;
}

export async function revokeSession(token) {
  const hash = sessionHash(token);
  if (hash) await pool.query('DELETE FROM public.auth_sessions WHERE token_hash = $1', [hash]);
}
