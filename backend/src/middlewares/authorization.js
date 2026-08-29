import { ForbiddenError, AuthenticationRequiredError } from '../errors/ApiError.js';

/**
 * Authorization helpers.
 *
 * These run AFTER authenticateUser (which populates req.user from the JWT).
 * Never trust ownership claims from the request body — always compare against
 * req.user.id (verified token identity).
 */

/**
 * authorizeResourceOwner(ownerId)
 * Rejects the request unless the authenticated user IS the resource owner.
 */
export function authorizeResourceOwner(ownerId) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationRequiredError());
    }
    if (req.user.id !== ownerId) {
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }
    next();
  };
}

/**
 * requireRole(...allowedRoles)
 * Role-based guard (RBAC). Users currently have no role column — this helper
 * is provided so a future role field can be enforced in one place.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationRequiredError());
    }
    const role = req.user.role;
    if (!role || !allowedRoles.includes(role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }
    next();
  };
}
