import { describe, it, expect } from 'vitest';
import {
  rawIndicatorSchema,
  ingestPayloadSchema,
  enrichmentResultSchema,
  threatIndicatorFilterSchema,
  parseCSVPayload
} from '../schemas.js';
import { IndicatorType, ThreatSeverity } from '../types.js';

describe('Schemas Validation', () => {
  it('validates a correct raw indicator', () => {
    const data = {
      value: '1.1.1.1',
      type: IndicatorType.IP_ADDRESS,
      source: 'test'
    };
    expect(rawIndicatorSchema.safeParse(data).success).toBe(true);
  });

  it('rejects raw indicator with empty value', () => {
    const data = {
      value: '',
      type: IndicatorType.IP_ADDRESS
    };
    expect(rawIndicatorSchema.safeParse(data).success).toBe(false);
  });

  it('rejects raw indicator with invalid type', () => {
    const data = {
      value: 'test',
      type: 'INVALID_TYPE'
    };
    expect(rawIndicatorSchema.safeParse(data).success).toBe(false);
  });

  it('validates a correct ingest payload', () => {
    const data = {
      indicators: [
        { value: '1.1.1.1', type: IndicatorType.IP_ADDRESS }
      ]
    };
    expect(ingestPayloadSchema.safeParse(data).success).toBe(true);
  });

  it('rejects empty ingest payload indicators array', () => {
    const data = { indicators: [] };
    expect(ingestPayloadSchema.safeParse(data).success).toBe(false);
  });

  it('validates a correct enrichment result', () => {
    const data = {
      severity: ThreatSeverity.HIGH,
      confidenceScore: 85,
      mitreTechniques: ['T1059', 'T1059.001'],
      analystBrief: 'This is a test analyst brief describing the threat.'
    };
    expect(enrichmentResultSchema.safeParse(data).success).toBe(true);
  });

  it('rejects enrichment result with out of range confidence', () => {
    const data = {
      severity: ThreatSeverity.HIGH,
      confidenceScore: 105,
      mitreTechniques: ['T1059'],
      analystBrief: 'This is a test brief'
    };
    expect(enrichmentResultSchema.safeParse(data).success).toBe(false);
  });

  it('rejects enrichment result with invalid MITRE format', () => {
    const data = {
      severity: ThreatSeverity.HIGH,
      confidenceScore: 80,
      mitreTechniques: ['INVALID_TECHNIQUE'],
      analystBrief: 'This is a test brief explaining why it is bad.'
    };
    expect(enrichmentResultSchema.safeParse(data).success).toBe(false);
  });

  it('validates correct filter schema', () => {
    const data = {
      search: 'test',
      severity: ThreatSeverity.HIGH,
      page: 1,
      pageSize: 10
    };
    expect(threatIndicatorFilterSchema.safeParse(data).success).toBe(true);
  });

  it('rejects invalid filter schema confidence range', () => {
    const data = { minConfidence: 150 };
    expect(threatIndicatorFilterSchema.safeParse(data).success).toBe(false);
  });

  describe('parseCSVPayload', () => {
    it('parses valid CSV correctly', () => {
      const csv = `value,type,source,tags\n1.1.1.1,IP_ADDRESS,src,tag1;tag2`;
      const parsed = parseCSVPayload(csv);
      expect(parsed.length).toBe(1);
      expect(parsed[0].value).toBe('1.1.1.1');
      expect(parsed[0].type).toBe(IndicatorType.IP_ADDRESS);
    });

    it('returns empty array for empty CSV', () => {
      expect(parseCSVPayload('')).toEqual([]);
    });

    it('defaults to DOMAIN if type is invalid', () => {
      const csv = `value,type\nmalicious.com,INVALID`;
      const parsed = parseCSVPayload(csv);
      expect(parsed[0].type).toBe(IndicatorType.DOMAIN);
    });

    it('handles missing optional fields', () => {
      const csv = `value,type\n1.1.1.1,IP_ADDRESS`;
      const parsed = parseCSVPayload(csv);
      expect(parsed[0].source).toBeUndefined();
    });

    it('ignores invalid rows gracefully', () => {
      const csv = `value,type\n,IP_ADDRESS`; // empty value should fail csvRowSchema
      const parsed = parseCSVPayload(csv);
      expect(parsed.length).toBe(0);
    });
  });
});
