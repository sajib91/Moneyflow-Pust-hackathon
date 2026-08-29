/**
 * AppError — base class for all application errors.
 *
 * Error response format (serialized by the central error handler):
 *   { success: false, error: { code, message, details? } }
 *
 * Error-code catalog:
 *   VALIDATION_ERROR      400  Request failed schema validation
 *   INVALID_AMOUNT        400  Amount is missing/malformed/zero/negative
 *   INVALID_REFERENCE     400  Referenced record does not exist (FK)
 *   AUTHENTICATION_REQUIRED 401 Missing, invalid or expired token
 *   INVALID_CREDENTIALS   401  Wrong email/password at login
 *   UNAUTHORIZED          401  Generic authentication failure (legacy alias)
 *   USER_INACTIVE         403  Account exists but is deactivated
 *   FORBIDDEN             403  Authenticated but not allowed
 *   RESOURCE_NOT_FOUND    404  Resource/route does not exist
 *   EMAIL_EXISTS          409  Duplicate email
 *   PHONE_EXISTS          409  Duplicate phone
 *   DUPLICATE_OPERATION   409  Idempotent operation already completed / DB duplicate
 *   REQUEST_NOT_PENDING   409  State-transition on a non-pending request
 *   CONFLICT              409  Generic conflict (legacy alias)
 *   SELF_TRANSFER         400  Sender === receiver
 *   INSUFFICIENT_FUNDS    400  Balance too low
 *   INTERNAL_ERROR        500  Unexpected error (details never exposed)
 */
export class AppError extends Error {
  constructor(code, message, statusCode, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------------------------------------------------------------------------
// 400 — Bad request
// ---------------------------------------------------------------------------

export class ValidationError extends AppError {
  constructor(details) {
    super('VALIDATION_ERROR', 'Validation failed', 400, details);
  }
}

export class InvalidAmountError extends AppError {
  constructor(details = {}) {
    super('INVALID_AMOUNT', 'Amount must be a positive number with at most two decimal places', 400, details);
  }
}

export class InvalidReferenceError extends AppError {
  constructor(message = 'Invalid reference') {
    super('INVALID_REFERENCE', message, 400);
  }
}

export class InsufficientFundsError extends AppError {
  constructor(available) {
    super('INSUFFICIENT_FUNDS', 'Insufficient balance.', 400, {
      available: available?.toString?.() ?? available,
    });
  }
}

export class SelfTransferError extends AppError {
  constructor() {
    super('SELF_TRANSFER', 'Cannot transfer money to yourself', 400);
  }
}

// ---------------------------------------------------------------------------
// 401 — Authentication
// ---------------------------------------------------------------------------

export class AuthenticationRequiredError extends AppError {
  constructor(message = 'Authentication required') {
    super('AUTHENTICATION_REQUIRED', message, 401);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
}

// ---------------------------------------------------------------------------
// 403 — Authorization
// ---------------------------------------------------------------------------

export class UserInactiveError extends AppError {
  constructor() {
    super('USER_INACTIVE', 'Your account is inactive', 403);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super('FORBIDDEN', message, 403);
  }
}

// ---------------------------------------------------------------------------
// 404 — Not found
// ---------------------------------------------------------------------------

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('RESOURCE_NOT_FOUND', `${resource} not found`, 404);
  }
}

// ---------------------------------------------------------------------------
// 409 — Conflict
// ---------------------------------------------------------------------------

export class EmailExistsError extends AppError {
  constructor() {
    super('EMAIL_EXISTS', 'Email already registered', 409);
  }
}

export class PhoneExistsError extends AppError {
  constructor() {
    super('PHONE_EXISTS', 'Phone number already registered', 409);
  }
}

export class DuplicateOperationError extends AppError {
  constructor(message = 'This operation was already completed', details = {}) {
    super('DUPLICATE_OPERATION', message, 409, details);
  }
}

export class RequestNotPendingError extends AppError {
  constructor() {
    super('REQUEST_NOT_PENDING', 'Request is not in PENDING state', 409);
  }
}

// ---------------------------------------------------------------------------
// Backward-compatible aliases (legacy service code)
// ---------------------------------------------------------------------------

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT', details = {}) {
    super(code, message, 409, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(existingResponse) {
    super('DUPLICATE_OPERATION', 'This operation was already completed', 409, { existingResponse });
  }
}

export class InvalidRequestStateError extends AppError {
  constructor(currentState, allowedStates) {
    super('REQUEST_NOT_PENDING', 'Request is not in a valid state for this action', 409, {
      currentState,
      allowedStates,
    });
  }
}
