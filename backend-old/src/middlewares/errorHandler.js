import { config } from '../config/index.js';
import { ApiError } from '../errors/ApiError.js';

export function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

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

  const statusCode = err.statusCode || 500;
  const message = config.nodeEnv === 'production' ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: 'INTERNAL_ERROR',
    message,
    details: config.nodeEnv === 'development' ? { stack: err.stack } : {},
  });
}

function handlePrismaError(err, res) {
  switch (err.code) {
    case 'P2002':
      return res.status(409).json({
        error: 'DUPLICATE_ENTRY',
        message: 'A record with this value already exists',
        details: { field: err.meta?.target },
      });
    case 'P2003':
      return res.status(400).json({
        error: 'FOREIGN_KEY_CONSTRAINT',
        message: 'Referenced record does not exist',
        details: { field: err.meta?.field_name },
      });
    case 'P2025':
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Record not found',
      });
    default:
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Database operation failed',
      });
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
}