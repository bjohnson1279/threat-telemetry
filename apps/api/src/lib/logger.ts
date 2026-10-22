import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Sentinel: HIGH - Prevent Sensitive Information Leakage
  // Redact sensitive keys from logs to prevent credential leakage
  redact: {
    paths: [
      'apiKey',
      '*.apiKey',
      '*.*.apiKey',
      'password',
      '*.password',
      'secret',
      'token',
      'authorization',
      'x-api-key',
      'req.headers["x-api-key"]',
      'req.headers.authorization',
      'err.config.headers.Authorization',
      'err.config.headers["x-api-key"]'
    ],
    censor: '[REDACTED]',
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
});
