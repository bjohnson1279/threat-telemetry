import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThreatEnrichmentService } from '../enrichment.js';

describe('ThreatEnrichmentService', () => {
  let service: ThreatEnrichmentService;

  beforeEach(() => {
    service = new ThreatEnrichmentService({
      provider: 'openai',
      apiKey: 'test-key',
    });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully enrich an indicator using OpenAI', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              severity: 'HIGH',
              confidenceScore: 85,
              mitreTechniques: ['T1566'],
              analystBrief: 'This is a test brief. It has two sentences.',
            }),
          },
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await service.enrich({
      value: '192.168.1.1',
      type: 'IP',
      rawPayload: {},
    });

    expect(result.severity).toBe('HIGH');
    expect(result.confidenceScore).toBe(85);
    expect(result.mitreTechniques).toContain('T1566');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on API failure and succeed', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              severity: 'LOW',
              confidenceScore: 20,
              mitreTechniques: [],
              analystBrief: 'A test brief. Second sentence.',
            }),
          },
        },
      ],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({ ok: false, statusText: 'Internal Server Error' })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    const result = await service.enrich({
      value: 'test.com',
      type: 'DOMAIN',
      rawPayload: {},
    });

    expect(result.severity).toBe('LOW');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should return fallback result after max retries fail', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, statusText: 'Bad Request' });

    const result = await service.enrich({
      value: 'bad.com',
      type: 'DOMAIN',
      rawPayload: {},
    });

    expect(result.severity).toBe('LOW');
    expect(result.confidenceScore).toBe(10);
    expect(result.analystBrief).toContain('Enrichment failed');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should validate Zod schema and retry if invalid', async () => {
    // Missing severity
    const badMockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              confidenceScore: 85,
              mitreTechniques: ['T1566'],
              analystBrief: 'Invalid. Missing severity.',
            }),
          },
        },
      ],
    };

    const goodMockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              severity: 'MEDIUM',
              confidenceScore: 85,
              mitreTechniques: ['T1566'],
              analystBrief: 'Valid response. Fixed.',
            }),
          },
        },
      ],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => badMockResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => goodMockResponse });

    const result = await service.enrich({
      value: '192.168.1.1',
      type: 'IP',
      rawPayload: {},
    });

    expect(result.severity).toBe('MEDIUM');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle malformed JSON response', async () => {
    const badMockResponse = {
      choices: [
        {
          message: {
            content: "This is not json",
          },
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => badMockResponse });

    const result = await service.enrich({
      value: '192.168.1.1',
      type: 'IP',
      rawPayload: {},
    });

    expect(result.analystBrief).toContain('Enrichment failed');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should correctly format request for Anthropic provider', async () => {
    const anthropicService = new ThreatEnrichmentService({
      provider: 'anthropic',
      apiKey: 'ant-key',
    });

    const mockResponse = {
      content: [
        {
          text: JSON.stringify({
            severity: 'CRITICAL',
            confidenceScore: 99,
            mitreTechniques: ['T1486'],
            analystBrief: 'Ransomware indicator. High severity.',
          }),
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await anthropicService.enrich({
      value: 'malicious.exe',
      type: 'SHA256',
      rawPayload: {},
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = (global.fetch as any).mock.calls[0];
    expect(fetchArgs[0]).toBe('https://api.anthropic.com/v1/messages');
    expect(fetchArgs[1].headers['x-api-key']).toBe('ant-key');
  });
});
