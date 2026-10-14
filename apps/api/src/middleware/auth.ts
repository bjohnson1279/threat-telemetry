import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';
import crypto from 'crypto';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const validKey = process.env.INTERNAL_API_KEY;

  if (!validKey) {
    logger.warn('INTERNAL_API_KEY is not set in the environment');
    res.status(500).json({ error: 'Internal Server Configuration Error' });
    return;
  }

  if (!apiKey || typeof apiKey !== 'string') {
    logger.warn({ ip: req.ip }, 'Unauthorized access attempt');
    res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    return;
  }

  // Sentinel: HIGH - Fix Length-Based Timing Attack Vulnerability
  // Hash both keys to fixed lengths before using crypto.timingSafeEqual to prevent leaking the length of the valid key.
  const providedKeyHash = crypto.createHash('sha256').update(apiKey).digest();
  const validKeyHash = crypto.createHash('sha256').update(validKey).digest();

  if (!crypto.timingSafeEqual(providedKeyHash, validKeyHash)) {
    logger.warn({ ip: req.ip }, 'Unauthorized access attempt');
    res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    return;
  }

  next();
};
