import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Sentinel: HIGH - Prevent Sensitive Information Leakage
  redact: {
    paths: [
      'apiKey',
      '*.apiKey',
      '*.*.apiKey',
      'api_key',
      '*.api_key',
      '*.*.api_key',
      'apikey',
      '*.apikey',
      '*.*.apikey',
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
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});
