import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll mock the Prisma client before importing the router to ensure it uses the mock.
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    threatIndicator: {
      create: vi.fn(),
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
import { ThreatEnrichmentService } from '../../services/enrichment.js';

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
  });

  it('should test ingest endpoint with valid JSON payload', async () => {
    const req = {
      headers: { 'content-type': 'application/json' },
      body: {
        indicators: [
          { value: '192.168.1.1', type: 'IP', rawPayload: {} }
        ]
      }
    };
    const res = mockResponse();

    await executeRoute('post', '/', req, res, mockNext);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      ingested: 1,
      ids: expect.any(Array),
    }));
  });

  it('should test ingest endpoint with invalid payload', async () => {
    const req = {
      headers: { 'content-type': 'application/json' },
      body: {
        indicators: [
          { type: 'IP' } // Missing value
        ]
      }
    };
    const res = mockResponse();

    await executeRoute('post', '/', req, res, mockNext);

    // Because it fails in zod validation schema (assuming ingestPayloadSchema works correctly)
    expect(mockNext).toHaveBeenCalled();
    const errorArg = mockNext.mock.calls[0][0];
    expect(errorArg.name).toBe('ZodError');
  });

  it('should test list endpoint with filters', async () => {
    const req = {
      query: {
        search: '192',
        indicatorType: 'IP',
        severity: 'HIGH',
      },
      headers: {},
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

  it('should test detail endpoint 404', async () => {
    const req = { params: { id: '00000000-0000-0000-0000-000000000000' }, headers: {} };
    const res = mockResponse();

    (prisma.threatIndicator.findUnique as any).mockResolvedValue(null);

    await executeRoute('get', '/:id', req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Indicator not found' });
  });

  it('should return validation error for invalid uuid on detail endpoint', async () => {
    const req = { params: { id: 'non-existent' }, headers: {} };
    const res = mockResponse();

    await executeRoute('get', '/:id', req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validation Error' }));
  });

  it('should test enrichment endpoint trigger', async () => {
    // Set dummy API keys for test
    process.env.LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test';

    const req = { params: { id: '12345678-1234-1234-1234-123456789012' }, headers: {} };
    const res = mockResponse();

    (prisma.threatIndicator.findUnique as any).mockResolvedValue({
      id: '12345678-1234-1234-1234-123456789012',
      indicatorValue: 'bad.com',
      indicatorType: 'DOMAIN',
      rawPayload: {}
    });

    (prisma.threatIndicator.update as any).mockResolvedValue({
      id: '12345678-1234-1234-1234-123456789012',
      severity: 'HIGH'
    });

    await executeRoute('post', '/:id/enrich', req, res, mockNext);

    expect(prisma.threatIndicator.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '12345678-1234-1234-1234-123456789012' },
      data: expect.objectContaining({
        severity: 'HIGH'
      })
    }));

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      id: '12345678-1234-1234-1234-123456789012',
      severity: 'HIGH'
    }));
  });
});
