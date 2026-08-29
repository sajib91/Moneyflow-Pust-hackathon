export class ApiError extends Error {
  constructor(message, statusCode, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApiError {
  constructor(details) {
    super('Validation failed', 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends ApiError {
  constructor(message, code = 'CONFLICT', details = {}) {
    super(message, 409, code, details);
  }
}

export class InsufficientFundsError extends ApiError {
  constructor(available) {
    super('Insufficient funds', 400, 'INSUFFICIENT_FUNDS', { available: available.toString() });
  }
}

export class IdempotencyConflictError extends ApiError {
  constructor(existingResponse) {
    super('Idempotency key already used', 409, 'IDEMPOTENCY_CONFLICT', { existingResponse });
  }
}

export class SelfTransferError extends ApiError {
  constructor() {
    super('Cannot transfer to yourself', 400, 'SELF_TRANSFER');
  }
}

export class InvalidRequestStateError extends ApiError {
  constructor(currentState, allowedStates) {
    super(
      `Request is in ${currentState} state, expected one of: ${allowedStates.join(', ')}`,
      409,
      'INVALID_REQUEST_STATE',
      { currentState, allowedStates }
    );
  }
}