import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Prisma client before importing the router to ensure it uses the mock.
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    threatIndicator: {
      create: vi.fn(),
      createManyAndReturn: vi.fn().mockResolvedValue([{ id: 'mocked-id' }]),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((operations) => Promise.all(operations.map((op: any) => ({ id: 'mocked-id' })))),
  },
}));

vi.mock('../../services/enrichment.js', () => {
  return {
    ThreatEnrichmentService: class {
      enrich = vi.fn().mockResolvedValue({
        severity: 'HIGH',
        confidenceScore: 90,
        mitreTechniques: ['T1566'],
        analystBrief: 'Mocked enrichment result.',
      });
    }
  };
});

import indicatorsRouter from '../indicators.js';
import { prisma } from '../../lib/prisma.js';

describe('Indicators Routes', () => {
  // Simple helper to simulate express middleware chain execution
  const executeRoute = async (method: string, path: string, req: any, res: any, next: any) => {
    // Find the registered route
    const routeInfo = indicatorsRouter.stack.find(
      (layer: any) => layer.route && layer.route.path === path && layer.route.methods[method.toLowerCase()]
    );
    
    if (!routeInfo || !routeInfo.route) {
      throw new Error(`Route ${method} ${path} not found`);
    }

    const handlers = routeInfo.route.stack.map((s: any) => s.handle);
    
    let i = 0;
    const runNext = async (err?: any): Promise<void> => {
      if (err) {
        next(err);
        return;
      }
      if (i < handlers.length) {
        const handler = handlers[i++];
        await handler(req, res, runNext);
      }
    };
    
    await runNext();
  };

  const mockResponse = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = 'test-internal-key';
  });

  describe('POST / (Ingestion)', () => {
    it('should ingest valid JSON payload', async () => {
      const req = {
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'test-internal-key'
        },
        body: {
          indicators: [
            { value: '192.168.1.1', type: 'IP', rawPayload: {} }
          ]
        }
      };
      const res = mockResponse();

      await executeRoute('post', '/', req, res, mockNext);

      expect(prisma.threatIndicator.createManyAndReturn).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ingested: 1,
        ids: expect.any(Array),
      }));
    });

    it('should reject invalid JSON payload missing value', async () => {
      const req = {
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'test-internal-key'
        },
        body: {
          indicators: [
            { type: 'IP' } // Missing value
          ]
        }
      };
      const res = mockResponse();

      await executeRoute('post', '/', req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const errorArg = mockNext.mock.calls[0][0];
      expect(errorArg.name).toBe('ZodError');
    });

    it('should reject JSON payload exceeding maximum 10,000 indicators (DoS protection)', async () => {
      const oversizedIndicators = new Array(10001).fill({ value: '192.168.1.1', type: 'IP' });
      const req = {
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'test-internal-key'
        },
        body: {
          indicators: oversizedIndicators
        }
      };
      const res = mockResponse();

      await executeRoute('post', '/', req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Payload too large: maximum 10,000 indicators allowed'
      });
      expect(prisma.threatIndicator.createManyAndReturn).not.toHaveBeenCalled();
    });

    it('should reject JSON payload with empty indicators array', async () => {
      const req = {
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'test-internal-key'
        },
        body: {
          indicators: []
        }
      };
      const res = mockResponse();

      await executeRoute('post', '/', req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const errorArg = mockNext.mock.calls[0][0];
      expect(errorArg.name).toBe('ZodError');
    });

    it('should ingest valid CSV payload', async () => {
      const csvData = 'value,type,source,tags\n10.0.0.1,IP,firewall,tag1;tag2\nexample.com,DOMAIN,dns,test';
      const req = {
        headers: {
          'content-type': 'text/csv',
          'x-api-key': 'test-internal-key'
        },
        body: csvData
      };
      const res = mockResponse();

      await executeRoute('post', '/', req, res, mockNext);

      expect(prisma.threatIndicator.createManyAndReturn).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ingested: expect.any(Number),
        ids: expect.any(Array),
      }));
    });

    it('should reject CSV payload with no indicators', async () => {
      const req = {
        headers: {
          'content-type': 'text/csv',
          'x-api-key': 'test-internal-key'
        },
        body: 'value,type\n' // headers only, no rows
      };
      const res = mockResponse();

      await executeRoute('post', '/', req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No indicators provided' });
    });

    it('should reject CSV payload with more than 10,000 lines', async () => {
      // Create CSV with 10,002 lines
      const lines = ['value,type'];
      for (let i = 0; i < 10002; i++) {
        lines.push(`192.168.1.${i % 250},IP`);
      }
      const csvData = lines.join('\n');

      const req = {
        headers: {
          'content-type': 'text/csv',
          'x-api-key': 'test-internal-key'
        },
        body: csvData
      };
      const res = mockResponse();

      await executeRoute('post', '/', req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Payload too large: maximum 10,000 indicators allowed'
      });
      expect(prisma.threatIndicator.createManyAndReturn).not.toHaveBeenCalled();
    });

    it('should reject unauthorized request to ingest endpoint', async () => {
      const req = {
        headers: {
          'content-type': 'application/json'
          // Missing x-api-key
        },
        ip: '127.0.0.1',
        app: { get: () => '127.0.0.1' },
        body: {
          indicators: [
            { value: '192.168.1.1', type: 'IP', rawPayload: {} }
          ]
        }
      };
      const res = mockResponse();

      await executeRoute('post', '/', req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unauthorized: Invalid or missing API key'
      }));
    });

    it('should handle multi-chunk batching (>100 indicators) and aggregate IDs and counts', async () => {
      // 250 items will be split into 3 chunks (100, 100, 50)
      const indicators = Array.from({ length: 250 }, (_, i) => ({
        value: `threat-${i}.com`,
        type: 'DOMAIN',
        rawPayload: { index: i },
      }));

      const req = {
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'test-internal-key',
        },
        body: { indicators },
      };
      const res = mockResponse();

      (prisma.threatIndicator.createManyAndReturn as any).mockImplementation(({ data }: any) => {
        return Promise.resolve(data.map((d: any, idx: number) => ({ id: `id-${d.indicatorValue}` })));
      });

      await executeRoute('post', '/', req, res, mockNext);

      expect(prisma.threatIndicator.createManyAndReturn).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ingested: 250,
        ids: expect.arrayContaining(['id-threat-0.com', 'id-threat-249.com']),
      });
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.ids).toHaveLength(250);
    });

    it('should normalize indicator values and apply domain defaults on ingestion', async () => {
      const req = {
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'test-internal-key',
        },
        body: {
          indicators: [
            { value: '  UPPERCASE-DOMAIN.COM  ', type: 'DOMAIN', rawPayload: { source: 'test' } },
            { value: '  USER@DOMAIN.COM ', type: 'EMAIL' },
          ],
        },
      };
      const res = mockResponse();

      (prisma.threatIndicator.createManyAndReturn as any).mockResolvedValue([
        { id: '1' },
        { id: '2' },
      ]);

      await executeRoute('post', '/', req, res, mockNext);

      expect(prisma.threatIndicator.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          {
            indicatorValue: 'uppercase-domain.com',
            indicatorType: 'DOMAIN',
            severity: 'LOW',
            confidenceScore: 0,
            rawPayload: { source: 'test' },
            mitreTechniques: [],
          },
          {
            indicatorValue: 'user@domain.com',
            indicatorType: 'EMAIL',
            severity: 'LOW',
            confidenceScore: 0,
            rawPayload: {},
            mitreTechniques: [],
          },
        ],
        select: { id: true },
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should propagate database errors during batch ingestion to next(error)', async () => {
      const req = {
        headers: {
          'content-type': 'application/json',
          'x-api-key': 'test-internal-key',
        },
        body: {
          indicators: [
            { value: '1.2.3.4', type: 'IP' },
          ],
        },
      };
      const res = mockResponse();

      const dbError = new Error('Database insertion failed');
      (prisma.threatIndicator.createManyAndReturn as any).mockRejectedValueOnce(dbError);

      await executeRoute('post', '/', req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('GET / (List & Filtering)', () => {
    it('should list indicators with filters', async () => {
      const req = {
        query: {
          search: '192',
          indicatorType: 'IP',
          severity: 'HIGH',
        },
        headers: { 'x-api-key': 'test-internal-key' },
      };
      const res = mockResponse();

      (prisma.threatIndicator.count as any).mockResolvedValue(10);
      (prisma.threatIndicator.findMany as any).mockResolvedValue([
        { id: '1', indicatorValue: '192.168.1.1' }
      ]);

      await executeRoute('get', '/', req, res, mockNext);

      expect(prisma.threatIndicator.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          indicatorValue: { contains: '192', mode: 'insensitive' },
          indicatorType: 'IP',
          severity: 'HIGH'
        })
      }));

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.any(Array),
        meta: expect.objectContaining({ total: 10 }),
      }));
    });

    it('should filter by confidence score range (minConfidence and maxConfidence)', async () => {
      const req = {
        query: {
          minConfidence: '20',
          maxConfidence: '80',
          page: '2',
          pageSize: '10',
          sortBy: 'confidenceScore',
          sortOrder: 'asc',
        },
        headers: { 'x-api-key': 'test-internal-key' },
      };
      const res = mockResponse();

      (prisma.threatIndicator.count as any).mockResolvedValue(25);
      (prisma.threatIndicator.findMany as any).mockResolvedValue([]);

      await executeRoute('get', '/', req, res, mockNext);

      expect(prisma.threatIndicator.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          confidenceScore: { gte: 20, lte: 80 }
        }),
        skip: 10,
        take: 10,
        orderBy: { confidenceScore: 'asc' }
      }));

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        meta: {
          total: 25,
          page: 2,
          pageSize: 10,
          totalPages: 3,
        }
      }));
    });

    it('should support single-boundary confidence score filters (only minConfidence or only maxConfidence)', async () => {
      // Test only minConfidence
      const reqMin = {
        query: { minConfidence: '50' },
        headers: { 'x-api-key': 'test-internal-key' },
      };
      const resMin = mockResponse();

      (prisma.threatIndicator.count as any).mockResolvedValue(5);
      (prisma.threatIndicator.findMany as any).mockResolvedValue([]);

      await executeRoute('get', '/', reqMin, resMin, mockNext);

      expect(prisma.threatIndicator.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { confidenceScore: { gte: 50 } },
      }));

      // Test only maxConfidence
      const reqMax = {
        query: { maxConfidence: '75' },
        headers: { 'x-api-key': 'test-internal-key' },
      };
      const resMax = mockResponse();

      await executeRoute('get', '/', reqMax, resMax, mockNext);

      expect(prisma.threatIndicator.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { confidenceScore: { lte: 75 } },
      }));
    });

    it('should support various sortBy columns and sort orders with default pagination', async () => {
      const sortColumns = ['indicatorValue', 'severity', 'createdAt'] as const;

      for (const sortBy of sortColumns) {
        const req = {
          query: { sortBy, sortOrder: 'asc' },
          headers: { 'x-api-key': 'test-internal-key' },
        };
        const res = mockResponse();

        (prisma.threatIndicator.count as any).mockResolvedValue(10);
        (prisma.threatIndicator.findMany as any).mockResolvedValue([]);

        await executeRoute('get', '/', req, res, mockNext);

        expect(prisma.threatIndicator.findMany).toHaveBeenCalledWith(expect.objectContaining({
          orderBy: { [sortBy]: 'asc' },
          skip: 0,
          take: 20, // default pageSize is 20
        }));
      }
    });

    it('should respect maximum allowed pageSize (100) and reject pageSize exceeding 100', async () => {
      const reqValid = {
        query: { page: '1', pageSize: '100' },
        headers: { 'x-api-key': 'test-internal-key' },
      };
      const resValid = mockResponse();

      (prisma.threatIndicator.count as any).mockResolvedValue(100);
      (prisma.threatIndicator.findMany as any).mockResolvedValue([]);

      await executeRoute('get', '/', reqValid, resValid, mockNext);

      expect(prisma.threatIndicator.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 0,
        take: 100,
      }));

      // Invalid pageSize > 100 should fail schema validation with 400
      const reqInvalid = {
        query: { page: '1', pageSize: '101' },
        headers: { 'x-api-key': 'test-internal-key' },
      };
      const resInvalid = mockResponse();

      await executeRoute('get', '/', reqInvalid, resInvalid, mockNext);

      expect(resInvalid.status).toHaveBeenCalledWith(400);
      expect(resInvalid.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Validation Error',
      }));
    });

    it('should propagate database error when prisma.threatIndicator.count rejects', async () => {
      const req = {
        query: {},
        headers: { 'x-api-key': 'test-internal-key' },
      };
      const res = mockResponse();

      const dbError = new Error('Database connection timed out');
      (prisma.threatIndicator.count as any).mockRejectedValueOnce(dbError);

      await executeRoute('get', '/', req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid query parameters exceeding boundaries', async () => {
      const invalidRequests = [
        { query: { page: '0' }, headers: { 'x-api-key': 'test-internal-key' } },
        { query: { pageSize: '0' }, headers: { 'x-api-key': 'test-internal-key' } },
        { query: { pageSize: '101' }, headers: { 'x-api-key': 'test-internal-key' } },
        { query: { minConfidence: '-5' }, headers: { 'x-api-key': 'test-internal-key' } },
        { query: { maxConfidence: '105' }, headers: { 'x-api-key': 'test-internal-key' } },
      ];

      for (const req of invalidRequests) {
        const res = mockResponse();
        await executeRoute('get', '/', req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validation Error' }));
      }
    });

    it('should reject unauthenticated request to list endpoint', async () => {
      const req = {
        query: {},
        headers: {},
      };
      const res = mockResponse();

      await executeRoute('get', '/', req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized: Invalid or missing API key' }));
    });
  });

  describe('GET /stats/summary', () => {
    it('should compute and return stats summary, then serve from cache', async () => {
      const req = {
        headers: { 'x-api-key': 'test-internal-key' }
      };
      const res1 = mockResponse();

      (prisma.threatIndicator.count as any).mockResolvedValue(150);
      (prisma.threatIndicator.groupBy as any)
        .mockResolvedValueOnce([{ severity: 'HIGH', _count: { severity: 50 } }])
        .mockResolvedValueOnce([{ indicatorType: 'IP', _count: { indicatorType: 100 } }]);
      (prisma.threatIndicator.aggregate as any).mockResolvedValue({
        _avg: { confidenceScore: 72.5 }
      });

      const routeInfo = (indicatorsRouter as any).stack.find(
        (layer: any) => layer.route && layer.route.path === '/stats/summary' && layer.route.methods.get
      );
      const handler = routeInfo.route.stack[routeInfo.route.stack.length - 1].handle;

      await handler(req, res1, mockNext);

      expect(res1.json).toHaveBeenCalledWith({
        totalCount: 150,
        countBySeverity: { HIGH: 50 },
        countByType: { IP: 100 },
        averageConfidence: 72.5
      });

      // Subsequent call should hit cache and not re-query prisma
      const res2 = mockResponse();
      vi.clearAllMocks();

      await handler(req, res2, mockNext);

      expect(res2.json).toHaveBeenCalledWith({
        totalCount: 150,
        countBySeverity: { HIGH: 50 },
        countByType: { IP: 100 },
        averageConfidence: 72.5
      });
      expect(prisma.threatIndicator.count).not.toHaveBeenCalled();
    });

    it('should prevent cache stampede by memoizing concurrent in-flight requests', async () => {
      // Advance time past cache TTL (10s)
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 20000);

      const req = {
        headers: { 'x-api-key': 'test-internal-key' }
      };
      const resA = mockResponse();
      const resB = mockResponse();

      let resolveCount: (val: number) => void;
      const countPromise = new Promise<number>((resolve) => {
        resolveCount = resolve;
      });

      (prisma.threatIndicator.count as any).mockImplementation(() => countPromise);
      (prisma.threatIndicator.groupBy as any)
        .mockResolvedValueOnce([{ severity: 'LOW', _count: { severity: 10 } }])
        .mockResolvedValueOnce([{ indicatorType: 'DOMAIN', _count: { indicatorType: 10 } }]);
      (prisma.threatIndicator.aggregate as any).mockResolvedValue({
        _avg: { confidenceScore: 50 }
      });

      const routeInfo = (indicatorsRouter as any).stack.find(
        (layer: any) => layer.route && layer.route.path === '/stats/summary' && layer.route.methods.get
      );
      const handler = routeInfo.route.stack[routeInfo.route.stack.length - 1].handle;

      // Trigger two concurrent executions while cache is expired
      const p1 = handler(req, resA, mockNext);
      const p2 = handler(req, resB, mockNext);

      resolveCount!(20);

      await Promise.all([p1, p2]);

      expect(resA.json).toHaveBeenCalledWith(expect.objectContaining({ totalCount: 20 }));
      expect(resB.json).toHaveBeenCalledWith(expect.objectContaining({ totalCount: 20 }));
      // Notice prisma.threatIndicator.count was only invoked once across both concurrent requests
      expect(prisma.threatIndicator.count).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should reset statsPromise and allow retry when aggregation fails', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 30000); // Past cache TTL

      const req = {
        headers: { 'x-api-key': 'test-internal-key' },
      };
      const res1 = mockResponse();
      const mockNextLocal = vi.fn();

      const dbError = new Error('Database stats aggregation failed');
      (prisma.threatIndicator.count as any).mockRejectedValueOnce(dbError);

      const routeInfo = (indicatorsRouter as any).stack.find(
        (layer: any) => layer.route && layer.route.path === '/stats/summary' && layer.route.methods.get
      );
      const handler = routeInfo.route.stack[routeInfo.route.stack.length - 1].handle;

      await handler(req, res1, mockNextLocal);

      expect(mockNextLocal).toHaveBeenCalledWith(dbError);

      // Now verify subsequent request can retry and succeed without permanently failing
      const res2 = mockResponse();
      (prisma.threatIndicator.count as any).mockResolvedValueOnce(42);
      (prisma.threatIndicator.groupBy as any)
        .mockResolvedValueOnce([{ severity: 'HIGH', _count: { severity: 42 } }])
        .mockResolvedValueOnce([{ indicatorType: 'IP', _count: { indicatorType: 42 } }]);
      (prisma.threatIndicator.aggregate as any).mockResolvedValueOnce({
        _avg: { confidenceScore: 80 },
      });

      await handler(req, res2, mockNextLocal);

      expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({
        totalCount: 42,
        averageConfidence: 80,
      }));

      vi.useRealTimers();
    });
  });

  describe('GET /:id (Detail)', () => {
    it('should return indicator detail when found', async () => {
      const uuid = '12345678-1234-4234-a234-123456789012';
      const mockIndicator = {
        id: uuid,
        indicatorValue: '192.168.1.1',
        indicatorType: 'IP',
        severity: 'MEDIUM',
      };
      const req = { params: { id: uuid }, headers: { 'x-api-key': 'test-internal-key' } };
      const res = mockResponse();

      (prisma.threatIndicator.findUnique as any).mockResolvedValue(mockIndicator);

      await executeRoute('get', '/:id', req, res, mockNext);

      expect(prisma.threatIndicator.findUnique).toHaveBeenCalledWith({ where: { id: uuid } });
      expect(res.json).toHaveBeenCalledWith(mockIndicator);
    });

    it('should return 404 when indicator is not found', async () => {
      const req = { params: { id: '00000000-0000-0000-0000-000000000000' }, headers: { 'x-api-key': 'test-internal-key' } };
      const res = mockResponse();

      (prisma.threatIndicator.findUnique as any).mockResolvedValue(null);

      await executeRoute('get', '/:id', req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Indicator not found' });
    });

    it('should return validation error for invalid uuid on detail endpoint', async () => {
      const req = { params: { id: 'non-existent' }, headers: { 'x-api-key': 'test-internal-key' } };
      const res = mockResponse();

      await executeRoute('get', '/:id', req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validation Error' }));
    });

    it('should reject unauthenticated request to detail endpoint', async () => {
      const uuid = '12345678-1234-4234-a234-123456789012';
      const req = { params: { id: uuid }, headers: {} };
      const res = mockResponse();

      await executeRoute('get', '/:id', req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized: Invalid or missing API key' }));
    });
  });

  describe('POST /:id/enrich (Enrichment)', () => {
    it('should test enrichment endpoint trigger', async () => {
      process.env.LLM_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'test';

      const req = {
        params: { id: '12345678-1234-4234-a234-123456789012' },
        headers: {
          'x-api-key': 'test-internal-key'
        },
        ip: '127.0.0.1',
        app: { get: () => '127.0.0.1' }
      };
      const res = mockResponse();

      (prisma.threatIndicator.findUnique as any).mockResolvedValue({
        id: '12345678-1234-4234-a234-123456789012',
        indicatorValue: 'bad.com',
        indicatorType: 'DOMAIN',
        rawPayload: {}
      });

      (prisma.threatIndicator.update as any).mockResolvedValue({
        id: '12345678-1234-4234-a234-123456789012',
        severity: 'HIGH'
      });

      const routeInfo = (indicatorsRouter as any).stack.find(
        (layer: any) => layer.route && layer.route.path === '/:id/enrich' && layer.route.methods.post
      );
      const handler = routeInfo.route.stack[routeInfo.route.stack.length - 1].handle;
      await handler(req, res, mockNext);

      expect(prisma.threatIndicator.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '12345678-1234-4234-a234-123456789012' },
        data: expect.objectContaining({
          severity: 'HIGH'
        })
      }));

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: '12345678-1234-4234-a234-123456789012',
        severity: 'HIGH'
      }));
    });

    it('should return 404 when indicator to enrich is not found', async () => {
      const req = {
        params: { id: '00000000-0000-0000-0000-000000000000' },
        headers: { 'x-api-key': 'test-internal-key' },
        ip: '127.0.0.1',
        app: { get: () => '127.0.0.1' }
      };
      const res = mockResponse();

      (prisma.threatIndicator.findUnique as any).mockResolvedValue(null);

      const routeInfo = (indicatorsRouter as any).stack.find(
        (layer: any) => layer.route && layer.route.path === '/:id/enrich' && layer.route.methods.post
      );
      const handler = routeInfo.route.stack[routeInfo.route.stack.length - 1].handle;
      await handler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Indicator not found' });
    });

    it('should return 500 when LLM API key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      process.env.LLM_PROVIDER = 'openai';

      const req = {
        params: { id: '12345678-1234-4234-a234-123456789012' },
        headers: { 'x-api-key': 'test-internal-key' },
        ip: '127.0.0.1',
        app: { get: () => '127.0.0.1' }
      };
      const res = mockResponse();

      (prisma.threatIndicator.findUnique as any).mockResolvedValue({
        id: '12345678-1234-4234-a234-123456789012',
        indicatorValue: 'bad.com',
        indicatorType: 'DOMAIN',
        rawPayload: {}
      });

      const routeInfo = (indicatorsRouter as any).stack.find(
        (layer: any) => layer.route && layer.route.path === '/:id/enrich' && layer.route.methods.post
      );
      const handler = routeInfo.route.stack[routeInfo.route.stack.length - 1].handle;
      await handler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Enrichment service unavailable' });
    });

    it('should enrich using Anthropic provider when LLM_PROVIDER is anthropic', async () => {
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

      const req = {
        params: { id: '12345678-1234-4234-a234-123456789012' },
        headers: { 'x-api-key': 'test-internal-key' },
        ip: '127.0.0.1',
        app: { get: () => '127.0.0.1' },
      };
      const res = mockResponse();

      (prisma.threatIndicator.findUnique as any).mockResolvedValue({
        id: '12345678-1234-4234-a234-123456789012',
        indicatorValue: 'anthropic-target.com',
        indicatorType: 'DOMAIN',
        rawPayload: { tag: 'apt' },
      });

      (prisma.threatIndicator.update as any).mockResolvedValue({
        id: '12345678-1234-4234-a234-123456789012',
        indicatorValue: 'anthropic-target.com',
        severity: 'HIGH',
      });

      const routeInfo = (indicatorsRouter as any).stack.find(
        (layer: any) => layer.route && layer.route.path === '/:id/enrich' && layer.route.methods.post
      );
      const handler = routeInfo.route.stack[routeInfo.route.stack.length - 1].handle;
      await handler(req, res, mockNext);

      expect(prisma.threatIndicator.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '12345678-1234-4234-a234-123456789012' },
        data: expect.objectContaining({
          severity: 'HIGH',
          confidenceScore: 90,
        }),
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: '12345678-1234-4234-a234-123456789012',
      }));
    });

    it('should propagate database update failure during enrichment to next(error)', async () => {
      process.env.LLM_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'sk-test';

      const req = {
        params: { id: '12345678-1234-4234-a234-123456789012' },
        headers: { 'x-api-key': 'test-internal-key' },
        ip: '127.0.0.1',
        app: { get: () => '127.0.0.1' },
      };
      const res = mockResponse();

      (prisma.threatIndicator.findUnique as any).mockResolvedValue({
        id: '12345678-1234-4234-a234-123456789012',
        indicatorValue: 'failing-db.com',
        indicatorType: 'DOMAIN',
        rawPayload: {},
      });

      const updateError = new Error('Database write lock collision');
      (prisma.threatIndicator.update as any).mockRejectedValueOnce(updateError);

      const routeInfo = (indicatorsRouter as any).stack.find(
        (layer: any) => layer.route && layer.route.path === '/:id/enrich' && layer.route.methods.post
      );
      const handler = routeInfo.route.stack[routeInfo.route.stack.length - 1].handle;
      await handler(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(updateError);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
