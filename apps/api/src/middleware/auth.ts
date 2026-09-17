import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const validKey = process.env.INTERNAL_API_KEY;

  if (!validKey) {
    logger.warn('INTERNAL_API_KEY is not set in the environment');
    res.status(500).json({ error: 'Internal Server Configuration Error' });
    return;
  }

  if (!apiKey || apiKey !== validKey) {
    logger.warn({ ip: req.ip }, 'Unauthorized access attempt');
    res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    return;
  }

  next();
};
