import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../errors/ApiError.js';
import prisma from '../config/prisma.js';

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedError('User not found or deactivated');
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new UnauthorizedError('Invalid token'));
    }
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Token expired'));
    }
    next(err);
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }
  authMiddleware(req, res, next);
}