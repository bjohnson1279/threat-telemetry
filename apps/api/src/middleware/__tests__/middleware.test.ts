import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { validate } from '../validate.js';
import { errorHandler } from '../errorHandler.js';

describe('Middleware Unit & Integration Tests', () => {
  const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth middleware', () => {
    const originalEnv = process.env.INTERNAL_API_KEY;

    afterEach(() => {
      process.env.INTERNAL_API_KEY = originalEnv;
    });

    it('should return 500 when INTERNAL_API_KEY is not configured', () => {
      delete process.env.INTERNAL_API_KEY;

      const req: any = {
        headers: { 'x-api-key': 'some-key' },
        ip: '127.0.0.1',
      };
      const res = mockResponse();

      requireAuth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Configuration Error',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when x-api-key header is missing', () => {
      process.env.INTERNAL_API_KEY = 'valid-secret-key';

      const req: any = {
        headers: {},
        ip: '127.0.0.1',
      };
      const res = mockResponse();

      requireAuth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized: Invalid or missing API key',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when x-api-key is not a string (e.g. array)', () => {
      process.env.INTERNAL_API_KEY = 'valid-secret-key';

      const req: any = {
        headers: { 'x-api-key': ['key1', 'key2'] },
        ip: '127.0.0.1',
      };
      const res = mockResponse();

      requireAuth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized: Invalid or missing API key',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when x-api-key is incorrect', () => {
      process.env.INTERNAL_API_KEY = 'valid-secret-key';

      const req: any = {
        headers: { 'x-api-key': 'wrong-key' },
        ip: '127.0.0.1',
      };
      const res = mockResponse();

      requireAuth(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized: Invalid or missing API key',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when x-api-key matches INTERNAL_API_KEY', () => {
      process.env.INTERNAL_API_KEY = 'valid-secret-key';

      const req: any = {
        headers: { 'x-api-key': 'valid-secret-key' },
        ip: '127.0.0.1',
      };
      const res = mockResponse();

      requireAuth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('validate middleware', () => {
    const testSchema = z.object({
      name: z.string().min(3),
      count: z.coerce.number().positive(),
    });

    it('should validate and parse body by default', () => {
      const middleware = validate(testSchema);
      const req: any = {
        body: { name: 'Alice', count: '42' },
      };
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(req.body).toEqual({ name: 'Alice', count: 42 });
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should validate and parse target (query/params) when specified', () => {
      const middleware = validate(testSchema, 'query');
      const req: any = {
        query: { name: 'Bob', count: '10' },
      };
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(req.query).toEqual({ name: 'Bob', count: 10 });
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should return 400 with details when schema validation fails', () => {
      const middleware = validate(testSchema, 'body');
      const req: any = {
        body: { name: 'Al', count: -5 },
      };
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Validation Error',
        details: expect.any(Array),
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should forward unexpected non-Zod errors to next(error)', () => {
      const badSchema: any = {
        parse: () => {
          throw new Error('Unexpected parsing error');
        },
      };

      const middleware = validate(badSchema);
      const req: any = { body: {} };
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('Unexpected parsing error');
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('errorHandler middleware', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should format and respond with 400 for ZodError', () => {
      const schema = z.object({ id: z.string().uuid() });
      const parseResult = schema.safeParse({ id: 'not-a-uuid' });
      const zodError = (parseResult as any).error;

      const req: any = {};
      const res = mockResponse();

      errorHandler(zodError, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation Error',
        details: zodError.issues,
      });
    });

    it('should format and respond with 400 for Prisma database errors (code starting with P)', () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed on the fields: (`indicatorValue`)',
      };

      const req: any = {};
      const res = mockResponse();

      errorHandler(prismaError, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Database Error',
        code: 'P2002',
      });
    });

    it('should respect custom error status code', () => {
      process.env.NODE_ENV = 'development';
      const customError: any = new Error('Custom forbidden action');
      customError.status = 403;

      const req: any = {};
      const res = mockResponse();

      errorHandler(customError, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Custom forbidden action',
      });
    });

    it('should expose error message in non-production environments', () => {
      process.env.NODE_ENV = 'development';
      const err = new Error('Something failed in development');

      const req: any = {};
      const res = mockResponse();

      errorHandler(err, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Something failed in development',
      });
    });

    it('should hide sensitive error message and return "Internal Server Error" in production', () => {
      process.env.NODE_ENV = 'production';
      const err = new Error('Sensitive DB connection string leaked');

      const req: any = {};
      const res = mockResponse();

      errorHandler(err, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
      });
    });
  });
});
