import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Error handling middleware
 * Catches and formats errors for API responses
 */
export const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Default error
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
  }

  if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  }

  if (err.code === '23505') { // PostgreSQL unique constraint violation
    status = 400;
    message = 'Duplicate entry';
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    status = 400;
    message = 'Referenced record does not exist';
  }

  // Send error response
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
  };

  // Include stack trace in development
  if (config.server.isDevelopment) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};

/**
 * Not found middleware
 * Handles 404 errors
 */
export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
