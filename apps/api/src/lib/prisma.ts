import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const isDev = process.env.NODE_ENV !== 'production';

export const prisma = new PrismaClient({
  log: isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
});

if (isDev) {
  prisma.$on('query' as never, (e: any) => {
    logger.debug(`Query: \${e.query}`);
  });
}
