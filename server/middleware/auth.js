const crypto = require('crypto');
const jwt = require('jsonwebtoken');

let loggedJwtFallback = false;

/**
 * Prefer JWT_SECRET. In production without it, derive a stable key from DATABASE_URL
 * so Vercel/Neon deploys work without an extra env var (set JWT_SECRET for best practice).
 */
function getJwtSecret() {
  const explicit = process.env.JWT_SECRET?.trim();
  if (explicit) return explicit;
  if (process.env.NODE_ENV !== 'production') {
    return 'dev-jwt-secret-change-me';
  }
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return null;
  }
  if (!loggedJwtFallback) {
    loggedJwtFallback = true;
    console.warn(
      '[auth] JWT_SECRET is not set; using a key derived from DATABASE_URL. Add JWT_SECRET in Vercel env for clearer rotation and portability.'
    );
  }
  return crypto.createHash('sha256').update(`jobscheduler-jwt-v1:${dbUrl}`).digest('hex');
}

function signToken(user) {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error('Set JWT_SECRET or DATABASE_URL in the server environment to enable login.');
  }
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    secret,
    { expiresIn: '7d' }
  );
}

function verifyTokenString(token) {
  if (!token || typeof token !== 'string') return null;
  const secret = getJwtSecret();
  if (!secret) return null;
  try {
    const payload = jwt.verify(token.trim(), secret);
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const secret = getJwtSecret();
  if (!secret) {
    return res.status(500).json({
      error: 'Server misconfiguration',
      details: 'Set JWT_SECRET or DATABASE_URL for the API.',
    });
  }
  try {
    const payload = jwt.verify(header.slice(7), secret);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireCustomer(req, res, next) {
  if (!req.user || req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Customer access required' });
  }
  next();
}

function requireAdminOrWorker(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'worker')) {
    return res.status(403).json({ error: 'Shop floor or admin access required' });
  }
  next();
}

module.exports = {
  signToken,
  verifyTokenString,
  requireAuth,
  requireAdmin,
  requireCustomer,
  requireAdminOrWorker,
};
