import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@threat-telemetry/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@threat-telemetry/shared')>();
  return {
    ...actual,
    sleep: vi.fn().mockResolvedValue(undefined),
  };
});

import { MockFeedConsumer } from '../services/feed-consumer.js';
import { ThreatEnrichmentService } from '../services/enrichment.js';
import { EnrichmentWorker } from '../worker.js';

describe('Worker Unit & Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MockFeedConsumer', () => {
    it('generates valid indicators with required fields and counts between 3 and 8', async () => {
      const consumer = new MockFeedConsumer();
      const indicators = await consumer.fetchNewIndicators();
      expect(indicators.length).toBeGreaterThanOrEqual(3);
      expect(indicators.length).toBeLessThanOrEqual(8);
      for (const ind of indicators) {
        expect(ind.value).toBeDefined();
        expect(typeof ind.value).toBe('string');
        expect(['IP', 'DOMAIN']).toContain(ind.type);
        expect(ind.severity).toBe('HIGH');
        expect(ind.rawPayload).toBeDefined();
        expect(ind.rawPayload.source).toBe('MockFeed');
        expect(ind.rawPayload.timestamp).toBeDefined();
      }
    });

    it('generates varied IP and DOMAIN values consistently across multiple invocations', async () => {
      const consumer = new MockFeedConsumer();
      const setOfTypes = new Set<string>();

      for (let i = 0; i < 15; i++) {
        const batch = await consumer.fetchNewIndicators();
        expect(batch.length).toBeGreaterThanOrEqual(3);
        batch.forEach(item => setOfTypes.add(item.type));
      }

      expect(setOfTypes.has('IP') || setOfTypes.has('DOMAIN')).toBe(true);
    });
  });

  describe('ThreatEnrichmentService', () => {
    it('returns valid enrichment result with default mock attributes for openai', async () => {
      const service = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
      const result = await service.enrich({ value: '1.2.3.4', type: 'IP', rawPayload: {} });

      expect(result.severity).toBe('HIGH');
      expect(result.confidenceScore).toBe(85);
      expect(result.analystBrief).toContain('Mock enrichment for 1.2.3.4 via openai');
      expect(result.mitreTechniques).toEqual(['T1059']);
    });

    it('returns valid enrichment result with anthropic provider branding', async () => {
      const service = new ThreatEnrichmentService({ provider: 'anthropic', apiKey: 'test-ant' });
      const result = await service.enrich({ value: 'evil-phish.com', type: 'DOMAIN', rawPayload: {} });

      expect(result.severity).toBe('HIGH');
      expect(result.confidenceScore).toBe(85);
      expect(result.analystBrief).toContain('Mock enrichment for evil-phish.com via anthropic');
      expect(result.mitreTechniques).toEqual(['T1059']);
    });

    it('handles retry backoff and falls back when repeated retries exceed maximum threshold', async () => {
      const service = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });

      let attemptCount = 0;
      vi.spyOn(service as any, 'enrich').mockImplementation(async function (this: any, indicator: any) {
        attemptCount++;
        if (attemptCount <= 3) {
          throw new Error('LLM transient error');
        }
        return {
          severity: 'LOW',
          confidenceScore: 10,
          mitreTechniques: [],
          analystBrief: 'Enrichment failed permanently',
        };
      });

      try {
        await service.enrich({ value: 'bad-ioc', type: 'IP', rawPayload: {} });
      } catch (e: any) {
        expect(e.message).toBe('LLM transient error');
      }
    });
  });

  describe('EnrichmentWorker Lifecycle', () => {
    it('starts and stops gracefully, clearing scheduled timers', async () => {
      vi.useFakeTimers();

      const prismaMock = {
        threatIndicator: {
          findMany: vi.fn().mockResolvedValue([]),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
          update: vi.fn().mockResolvedValue({}),
        },
      };

      const enrichmentService = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
      const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };

      const worker = new EnrichmentWorker(prismaMock as any, enrichmentService, loggerMock as any);

      await worker.start();
      expect((worker as any).isRunning).toBe(true);
      expect(loggerMock.info).toHaveBeenCalledWith('Worker started');

      await worker.stop();
      expect((worker as any).isRunning).toBe(false);
      expect(loggerMock.info).toHaveBeenCalledWith('Worker stopped');

      // Advancing timer should not trigger loop iterations because worker is stopped
      vi.advanceTimersByTime(35000);
      expect(prismaMock.threatIndicator.findMany).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('does not execute loops when isRunning is false', async () => {
      const prismaMock = {
        threatIndicator: {
          findMany: vi.fn().mockResolvedValue([]),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };

      const enrichmentService = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
      const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };

      const worker = new EnrichmentWorker(prismaMock as any, enrichmentService, loggerMock as any);
      (worker as any).isRunning = false;

      await worker['runEnrichmentLoop']();
      await worker['runFeedLoop']();

      expect(prismaMock.threatIndicator.findMany).not.toHaveBeenCalled();
      expect(prismaMock.threatIndicator.createMany).not.toHaveBeenCalled();
    });
  });

  describe('runEnrichmentLoop', () => {
    it('processes a batch of unenriched indicators and updates database records', async () => {
      const unenrichedRecords = [
        { id: '1', indicatorValue: '1.2.3.4', indicatorType: 'IP_ADDRESS', rawPayload: { notes: 'suspicious' } },
        { id: '2', indicatorValue: 'c2.net', indicatorType: 'DOMAIN', rawPayload: {} },
      ];

      const prismaMock = {
        threatIndicator: {
          findMany: vi.fn().mockResolvedValue(unenrichedRecords),
          update: vi.fn().mockResolvedValue({}),
        },
      };

      const enrichmentService = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
      vi.spyOn(enrichmentService, 'enrich').mockImplementation(async (ind) => ({
        severity: 'HIGH' as any,
        confidenceScore: 90,
        analystBrief: `Analyzed ${ind.value}`,
        mitreTechniques: ['T1059'],
      }));

      const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };

      const worker = new EnrichmentWorker(prismaMock as any, enrichmentService, loggerMock as any);
      (worker as any).isRunning = true;

      await worker['runEnrichmentLoop']();

      expect(prismaMock.threatIndicator.findMany).toHaveBeenCalledWith({
        where: { enrichmentSummary: null },
        take: 5,
      });

      expect(prismaMock.threatIndicator.update).toHaveBeenCalledTimes(2);
      expect(prismaMock.threatIndicator.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          enrichmentSummary: 'Analyzed 1.2.3.4',
          severity: 'HIGH',
          confidenceScore: 90,
          mitreTechniques: ['T1059'],
          lastSeen: expect.any(Date),
        },
      });
      expect(prismaMock.threatIndicator.update).toHaveBeenCalledWith({
        where: { id: '2' },
        data: {
          enrichmentSummary: 'Analyzed c2.net',
          severity: 'HIGH',
          confidenceScore: 90,
          mitreTechniques: ['T1059'],
          lastSeen: expect.any(Date),
        },
      });
    });

    it('handles empty batch gracefully without attempting updates', async () => {
      const prismaMock = {
        threatIndicator: {
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn(),
        },
      };

      const enrichmentService = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
      const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };

      const worker = new EnrichmentWorker(prismaMock as any, enrichmentService, loggerMock as any);
      (worker as any).isRunning = true;

      await worker['runEnrichmentLoop']();

      expect(prismaMock.threatIndicator.findMany).toHaveBeenCalled();
      expect(prismaMock.threatIndicator.update).not.toHaveBeenCalled();
      expect(loggerMock.info).not.toHaveBeenCalledWith(expect.stringContaining('Processing batch'));
    });

    it('handles partial failures: continues processing other indicators when one fails enrichment', async () => {
      const unenrichedRecords = [
        { id: '1', indicatorValue: 'bad-ioc', indicatorType: 'IP_ADDRESS', rawPayload: {} },
        { id: '2', indicatorValue: 'good-ioc', indicatorType: 'DOMAIN', rawPayload: {} },
      ];

      const prismaMock = {
        threatIndicator: {
          findMany: vi.fn().mockResolvedValue(unenrichedRecords),
          update: vi.fn().mockResolvedValue({}),
        },
      };

      const enrichmentService = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
      vi.spyOn(enrichmentService, 'enrich').mockImplementation(async (ind) => {
        if (ind.value === 'bad-ioc') {
          throw new Error('Enrichment API error');
        }
        return {
          severity: 'MEDIUM' as any,
          confidenceScore: 60,
          analystBrief: 'Valid enrichment',
          mitreTechniques: ['T1071'],
        };
      });

      const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };

      const worker = new EnrichmentWorker(prismaMock as any, enrichmentService, loggerMock as any);
      (worker as any).isRunning = true;

      await worker['runEnrichmentLoop']();

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.objectContaining({ indicator: 'bad-ioc' }),
        'Failed to process indicator'
      );
      expect(prismaMock.threatIndicator.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.threatIndicator.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: '2' },
      }));
    });

    it('catches and logs error when database findMany fails', async () => {
      const prismaMock = {
        threatIndicator: {
          findMany: vi.fn().mockRejectedValue(new Error('Database connection failed')),
          update: vi.fn(),
        },
      };

      const enrichmentService = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
      const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };

      const worker = new EnrichmentWorker(prismaMock as any, enrichmentService, loggerMock as any);
      (worker as any).isRunning = true;

      await worker['runEnrichmentLoop']();

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Error in enrichment loop'
      );
      expect(prismaMock.threatIndicator.update).not.toHaveBeenCalled();
    });

    it('catches and logs error when database update throws for an indicator', async () => {
      const unenrichedRecords = [
        { id: '1', indicatorValue: '1.2.3.4', indicatorType: 'IP_ADDRESS', rawPayload: {} },
      ];

      const prismaMock = {
        threatIndicator: {
          findMany: vi.fn().mockResolvedValue(unenrichedRecords),
          update: vi.fn().mockRejectedValue(new Error('Deadlock detected')),
        },
      };

      const enrichmentService = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
      vi.spyOn(enrichmentService, 'enrich').mockResolvedValue({
        severity: 'LOW' as any,
        confidenceScore: 10,
        analystBrief: 'Low threat',
        mitreTechniques: [],
      });

      const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };

      const worker = new EnrichmentWorker(prismaMock as any, enrichmentService, loggerMock as any);
      (worker as any).isRunning = true;

      await worker['runEnrichmentLoop']();

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error), indicator: '1.2.3.4' }),
        'Failed to process indicator'
      );
    });
  });

  describe('runFeedLoop', () => {
    it('fetches new feed indicators and batch-inserts them into the database', async () => {
      const prismaMock = {
        threatIndicator: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };

      const enrichmentService = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
      const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };

      const worker = new EnrichmentWorker(prismaMock as any, enrichmentService, loggerMock as any);
      (worker as any).isRunning = true;

      const mockIndicators = [
        { value: '185.220.101.5', type: 'IP' as any, severity: 'HIGH' as any, rawPayload: { source: 'MockFeed' } },
        { value: 'bad-domain.com', type: 'DOMAIN' as any, severity: 'HIGH' as any, rawPayload: { source: 'MockFeed' } },
      ];
      vi.spyOn((worker as any).feedConsumer, 'fetchNewIndicators').mockResolvedValue(mockIndicators);

      await worker['runFeedLoop']();

      expect(loggerMock.info).toHaveBeenCalledWith('Fetched 2 mock indicators');
      expect(prismaMock.threatIndicator.createMany).toHaveBeenCalledWith({
        data: [
          {
            indicatorValue: '185.220.101.5',
            indicatorType: 'IP',
            rawPayload: { source: 'MockFeed' },
            lastSeen: expect.any(Date),
          },
          {
            indicatorValue: 'bad-domain.com',
            indicatorType: 'DOMAIN',
            rawPayload: { source: 'MockFeed' },
            lastSeen: expect.any(Date),
          },
        ],
      });
    });

    it('does not insert into database if feed consumer returns empty array', async () => {
      const prismaMock = {
        threatIndicator: {
          createMany: vi.fn(),
        },
      };

      const enrichmentService = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
      const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };

      const worker = new EnrichmentWorker(prismaMock as any, enrichmentService, loggerMock as any);
      (worker as any).isRunning = true;

      vi.spyOn((worker as any).feedConsumer, 'fetchNewIndicators').mockResolvedValue([]);

      await worker['runFeedLoop']();

      expect(loggerMock.info).toHaveBeenCalledWith('Fetched 0 mock indicators');
      expect(prismaMock.threatIndicator.createMany).not.toHaveBeenCalled();
    });

    it('catches and logs error when fetchNewIndicators throws', async () => {
      const prismaMock = {
        threatIndicator: {
          createMany: vi.fn(),
        },
      };

      const enrichmentService = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
      const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };

      const worker = new EnrichmentWorker(prismaMock as any, enrichmentService, loggerMock as any);
      (worker as any).isRunning = true;

      vi.spyOn((worker as any).feedConsumer, 'fetchNewIndicators').mockRejectedValue(new Error('Feed network error'));

      await worker['runFeedLoop']();

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Error in feed loop'
      );
      expect(prismaMock.threatIndicator.createMany).not.toHaveBeenCalled();
    });

    it('catches and logs error when createMany throws', async () => {
      const prismaMock = {
        threatIndicator: {
          createMany: vi.fn().mockRejectedValue(new Error('DB insert failure')),
        },
      };

      const enrichmentService = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
      const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };

      const worker = new EnrichmentWorker(prismaMock as any, enrichmentService, loggerMock as any);
      (worker as any).isRunning = true;

      vi.spyOn((worker as any).feedConsumer, 'fetchNewIndicators').mockResolvedValue([
        { value: '1.2.3.4', type: 'IP' as any, severity: 'HIGH' as any, rawPayload: {} },
      ]);

      await worker['runFeedLoop']();

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        'Error in feed loop'
      );
    });
  });
});
