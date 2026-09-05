import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isDev = process.env.NODE_ENV !== 'production';
  logger.error(err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      details: err.errors,
    });
    return;
  }

  // Prisma errors can be checked here, avoiding explicit import for simplicity or importing PrismaClient
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    res.status(400).json({
      error: 'Database Error',
      code: err.code,
    });
    return;
  }

  const status = err.status || 500;

  // Sentinel: Medium - Fix Information Leakage
  // Only expose raw error messages in development or if the status is not 500
  // to avoid leaking sensitive internal details like stack traces or service failures.
  const message = (status === 500 && !isDev)
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');

  res.status(status).json({
    error: message,
  });
};
