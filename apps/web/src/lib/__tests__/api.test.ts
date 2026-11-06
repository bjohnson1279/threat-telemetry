import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchIndicators,
  fetchIndicator,
  fetchStats,
  ingestIndicators,
  triggerEnrichment,
} from '../api';
import { IndicatorType, ThreatSeverity } from '@threat-telemetry/shared';

describe('Web API Client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchIndicators', () => {
    it('constructs query parameters correctly and returns paginated response', async () => {
      const mockResult = {
        data: [{ id: '1', indicatorValue: '1.1.1.1' }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const filters = {
        search: '1.1.1.1',
        indicatorType: IndicatorType.IP_ADDRESS,
        severity: ThreatSeverity.HIGH,
        minConfidence: 80,
        page: 1,
        pageSize: 10,
        sortBy: 'confidenceScore' as const,
        sortOrder: 'desc' as const,
      };

      const result = await fetchIndicators(filters);
      expect(result).toEqual(mockResult);

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/api/v1/indicators?');
      expect(url).toContain('search=1.1.1.1');
      expect(url).toContain('indicatorType=IP_ADDRESS');
      expect(url).toContain('severity=HIGH');
      expect(url).toContain('minConfidence=80');
      expect(url).toContain('page=1');
      expect(url).toContain('pageSize=10');
      expect(url).toContain('sortBy=confidenceScore');
      expect(url).toContain('sortOrder=desc');
      expect((options.headers as Record<string, string>)).toHaveProperty('x-api-key');
    });

    it('handles empty filters and zero values correctly', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await fetchIndicators({ minConfidence: 0 });
      expect(result).toEqual(mockResult);

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/indicators?minConfidence=0');
    });

    it('throws error when response is not ok', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(fetchIndicators({})).rejects.toThrow('Failed to fetch indicators');
    });
  });

  describe('fetchIndicator', () => {
    it('calls GET /indicators/:id and returns indicator data', async () => {
      const mockIndicator = { id: 'uuid-123', indicatorValue: 'bad.com' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndicator,
      } as Response);

      const result = await fetchIndicator('uuid-123');
      expect(result).toEqual(mockIndicator);
      const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/indicators/uuid-123');
      expect((options.headers as Record<string, string>)).toHaveProperty('x-api-key');
    });

    it('throws error when indicator is not found', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(fetchIndicator('non-existent')).rejects.toThrow('Failed to fetch indicator');
    });
  });

  describe('fetchStats', () => {
    it('calls GET /indicators/stats/summary and returns stats', async () => {
      const mockStats = {
        total: 100,
        critical: 5,
        high: 20,
        avgConfidence: 75,
        activeMitreTechniques: 12,
      };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      } as Response);

      const result = await fetchStats();
      expect(result).toEqual(mockStats);
      const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/indicators/stats/summary');
      expect((options.headers as Record<string, string>)).toHaveProperty('x-api-key');
    });

    it('throws error when stats fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(fetchStats()).rejects.toThrow('Failed to fetch stats');
    });
  });

  describe('ingestIndicators', () => {
    it('calls POST /ingest with payload and returns ingested count', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ingested: 2 }),
      } as Response);

      const payload = {
        indicators: [
          { value: '1.2.3.4', type: IndicatorType.IP_ADDRESS },
          { value: 'malware.com', type: IndicatorType.DOMAIN },
        ],
      };
      const result = await ingestIndicators(payload);
      expect(result).toEqual({ ingested: 2 });

      const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/ingest');
      expect(options.method).toBe('POST');
      expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect((options.headers as Record<string, string>)).toHaveProperty('x-api-key');
      expect(JSON.parse(options.body as string)).toEqual(payload);
    });

    it('throws error when ingest fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as Response);

      await expect(ingestIndicators({ indicators: [] })).rejects.toThrow('Failed to ingest indicators');
    });
  });

  describe('triggerEnrichment', () => {
    it('calls POST /indicators/:id/enrich and returns updated indicator', async () => {
      const mockEnriched = { id: 'uuid-123', severity: ThreatSeverity.HIGH };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEnriched,
      } as Response);

      const result = await triggerEnrichment('uuid-123');
      expect(result).toEqual(mockEnriched);

      const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/indicators/uuid-123/enrich');
      expect(options.method).toBe('POST');
      expect((options.headers as Record<string, string>)).toHaveProperty('x-api-key');
    });

    it('throws error when trigger enrichment fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(triggerEnrichment('uuid-123')).rejects.toThrow('Failed to trigger enrichment');
    });
  });
});
