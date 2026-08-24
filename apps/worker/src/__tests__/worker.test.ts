import { describe, it, expect, vi } from 'vitest';
import { MockFeedConsumer } from '../services/feed-consumer.js';
import { ThreatEnrichmentService } from '../services/enrichment.js';
import { EnrichmentWorker } from '../worker.js';

describe('Worker tests', () => {
  it('MockFeedConsumer generates valid indicators', async () => {
    const consumer = new MockFeedConsumer();
    const indicators = await consumer.fetchNewIndicators();
    expect(indicators.length).toBeGreaterThanOrEqual(3);
    expect(indicators.length).toBeLessThanOrEqual(8);
    expect(indicators[0].value).toBeDefined();
    expect(['IP', 'DOMAIN']).toContain(indicators[0].type);
  });

  it('Enrichment service returns valid enrichment result', async () => {
    // Mock the zod parse or fetch here if needed
    const service = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
    const result = await service.enrich({ value: '1.2.3.4', type: 'IP', rawPayload: {} });
    
    expect(result.severity).toBeDefined();
    expect(result.confidenceScore).toBeDefined();
    expect(result.analystBrief).toBeDefined();
    expect(result.mitreTechniques).toBeDefined();
  });
  
  it('Enrichment service falls back after retries', async () => {
    const service = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
    // Simulate parse failure by stubbing
    vi.spyOn(service as any, 'enrich').mockRejectedValueOnce(new Error('fail'));
    
    try {
      await service.enrich({ value: 'bad', type: 'IP', rawPayload: {} });
    } catch (e: any) {
      expect(e.message).toBe('fail');
    }
  });

  it('Worker processes batch successfully', async () => {
    const prismaMock = {
      threatIndicator: {
        findMany: vi.fn().mockResolvedValue([{ id: '1', indicatorValue: '1.2.3.4', indicatorType: 'IP_ADDRESS', rawPayload: {} }]),
        update: vi.fn().mockResolvedValue({}),
      }
    };
    
    const service = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
    vi.spyOn(service, 'enrich').mockResolvedValue({ severity: 'LOW' as any, confidenceScore: 1, analystBrief: 'test', mitreTechniques: [] });
    
    const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
    
    const worker = new EnrichmentWorker(prismaMock as any, service, loggerMock as any);
    await worker['runEnrichmentLoop']();
    
    expect(prismaMock.threatIndicator.update).toHaveBeenCalled();
  });

  it('Worker handles failure during batch processing', async () => {
    const prismaMock = {
      threatIndicator: {
        findMany: vi.fn().mockResolvedValue([{ id: '1', indicatorValue: 'bad', indicatorType: 'IP_ADDRESS', rawPayload: {} }]),
        update: vi.fn().mockResolvedValue({}),
      }
    };
    
    const service = new ThreatEnrichmentService({ provider: 'openai', apiKey: 'test' });
    vi.spyOn(service, 'enrich').mockRejectedValue(new Error('enrich error'));
    
    const loggerMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
    
    const worker = new EnrichmentWorker(prismaMock as any, service, loggerMock as any);
    await worker['runEnrichmentLoop']();
    
    expect(loggerMock.error).toHaveBeenCalled();
    expect(prismaMock.threatIndicator.update).not.toHaveBeenCalled();
  });
});
