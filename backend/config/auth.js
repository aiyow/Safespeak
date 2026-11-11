import 'dotenv/config';
import { randomBytes } from 'node:crypto';

export const host = process.env.HOST || '127.0.0.1';
const localHosts = new Set(['127.0.0.1', '[::1]', '::1', 'localhost']);
const clientUrl = new URL(process.env.CLIENT_URL || 'http://localhost:5173');
const development = process.env.NODE_ENV === 'development';
const loopbackListener = host === '127.0.0.1' || host === '::1';
const localDevelopment = development && loopbackListener && localHosts.has(clientUrl.hostname);

export const clientOrigin = clientUrl.origin;
export const testRegistration = process.argv.includes('--local-signup')
  || process.env.ENABLE_TEST_REGISTRATION === 'true';
export const trustLoopbackProxy = process.env.TRUST_LOOPBACK_PROXY === 'true';

if (testRegistration && (!localDevelopment || trustLoopbackProxy)) {
  throw new Error('Test registration requires loopback development without a trusted proxy.');
}
if (trustLoopbackProxy && !loopbackListener) {
  throw new Error('The trusted reverse proxy requires a loopback listener.');
}
if (clientUrl.protocol !== 'https:' && !(localDevelopment && clientUrl.protocol === 'http:')) {
  throw new Error('CLIENT_URL must use HTTPS outside loopback development.');
}

const jwtSecret = process.env.JWT_SECRET;
if ((!jwtSecret && !localDevelopment) || (jwtSecret && Buffer.byteLength(jwtSecret) < 32)) {
  throw new Error('Set JWT_SECRET to a random secret of at least 32 bytes.');
}

export const sessionSigningKey = jwtSecret || randomBytes(32);
export const sessionDuration = 8 * 60 * 60 * 1000;
export const sessionCookie = localDevelopment ? 'safespeak_session' : '__Host-safespeak_session';
export const cookieOptions = {
  httpOnly: true,
  secure: !localDevelopment,
  sameSite: 'lax',
  path: '/'
};
