import { clientOrigin } from '../config/auth.js';
export function requestGuard(req, res, next) {
  res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('Origin') !== clientOrigin) {
    return res.status(403).json({ message: 'This request must come from the SafeSpeak site.' });
  }
  if (['POST', 'PATCH', 'PUT'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ message: 'Use application/json for this request.' });
  }
  next();
}
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Administrator access is required.' });
  next();
}
export function validate(schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0].message), { status: 400 });
  return parsed.data;
}
export function apiError(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : error.status || 500;
  if (status >= 500) console.error('FAQ request failed:', error.code || error.name);
  res.status(status).json({ message: status >= 500 ? 'SafeSpeak could not complete this request. Try again.' : status === 413 ? 'The request is too large.' : error.type === 'entity.parse.failed' ? 'Invalid JSON request.' : error.message });
}
