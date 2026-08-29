import { AppError } from '../errors/ApiError.js';

// =============================================================================
// Central error handler — the ONLY place that turns thrown errors into HTTP
// responses. Every response uses the consistent shape:
//   { success: false, error: { code, message, details? } }
// Internal details (stack traces, SQL, Prisma internals) are logged
// server-side only and NEVER sent to the client.
// =============================================================================

export function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  // Curated application errors.
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(Object.keys(err.details).length > 0 ? { details: err.details } : {}),
      },
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    return handlePrismaError(err, res);
  }

  // Malformed JSON body sent by the client.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
    });
  }

  // Unexpected errors — never expose implementation details. This includes
  // PrismaClientValidationError, which signals an internal bug (our code
  // passed invalid arguments to Prisma), never a client mistake.
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
}

function handlePrismaError(err, res) {
  switch (err.code) {
    case 'P2002': {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(',') : '';
      const field = String(target).toLowerCase();
      const code = field.includes('email') ? 'EMAIL_EXISTS' : field.includes('phone') ? 'PHONE_EXISTS' : 'DUPLICATE_OPERATION';
      const message =
        code === 'EMAIL_EXISTS'
          ? 'Email already registered'
          : code === 'PHONE_EXISTS'
            ? 'Phone number already registered'
            : 'This operation was already completed';
      return res.status(409).json({ success: false, error: { code, message } });
    }
    case 'P2003':
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REFERENCE', message: 'Referenced record does not exist' },
      });
    case 'P2025':
      return res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Record not found' },
      });
    default:
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
  }
}

// 404 for unknown routes — same consistent shape.
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'RESOURCE_NOT_FOUND', message: 'Route not found' },
  });
}
