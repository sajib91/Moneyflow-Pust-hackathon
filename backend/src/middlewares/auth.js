import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../errors/ApiError.js';
import prisma from '../config/prisma.js';

/**
 * authenticateUser — bearer-token authentication middleware.
 *
 * - Verifies the JWT signature/expiry.
 * - Loads the user from PostgreSQL (identity is never taken from the
 *   request body — always from the verified token).
 * - Rejects deactivated accounts.
 * - Attaches the authenticated identity to req.user (id, email, name).
 */
export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Session expired, please log in again');
      }
      throw new UnauthorizedError('Invalid token');
    }

    if (!decoded?.id || typeof decoded.id !== 'string') {
      throw new UnauthorizedError('Invalid token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, active: true },
    });

    if (!user || !user.active) {
      throw new UnauthorizedError('User not found or deactivated');
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
}

// Backwards-compatible alias (existing routes import authMiddleware).
export const authMiddleware = authenticateUser;

/** Authenticate only if a token is present; leave req.user undefined otherwise. */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }
  return authenticateUser(req, res, next);
}
