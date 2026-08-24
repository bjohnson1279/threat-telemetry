import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
};
