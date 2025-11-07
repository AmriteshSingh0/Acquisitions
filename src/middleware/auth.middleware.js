import logger from '#config/logger.js';
import { cookies } from '#utils/cookies.js';
import { jwttoken } from '#utils/jwt.js';

export const requireAuth = (req, res, next) => {
  try {
    const token = cookies.get(req, 'token');
    if (!token) {
      logger.warn('Auth failed: no token provided', { ip: req.ip, path: req.path });
      return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
    }

    const payload = jwttoken.verify(token);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    return next();
  } catch (e) {
    logger.warn('Auth failed: invalid token', { ip: req.ip, path: req.path });
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
};
