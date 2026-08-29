import { ApiError } from '../errors/ApiError.js';

export function errorHandler(err, req, res, next) {
  // Full details are logged server-side only — never echoed to the client.
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  // Curated, safe errors (validation, auth, conflicts, ...).
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    return handlePrismaError(err, res);
  }

  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'The request is not valid',
    });
  }

  // Unknown errors: never leak stack traces, SQL, or internal messages.
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Internal server error',
    details: {},
  });
}

function handlePrismaError(err, res) {
  switch (err.code) {
    case 'P2002':
      return res.status(409).json({
        error: 'DUPLICATE_ENTRY',
        message: 'A record with this value already exists',
        details: {},
      });
    case 'P2003':
      return res.status(400).json({
        error: 'INVALID_REFERENCE',
        message: 'Referenced record does not exist',
        details: {},
      });
    case 'P2025':
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Record not found',
        details: {},
      });
    default:
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
        details: {},
      });
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Route not found',
    details: {},
  });
}
