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

  it('rejects raw indicator with value exceeding max length (2048 chars)', () => {
    const data = {
      value: 'a'.repeat(2049),
      type: IndicatorType.DOMAIN
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

  it('rejects raw indicator with too many tags (>100)', () => {
    const data = {
      value: '1.1.1.1',
      type: IndicatorType.IP_ADDRESS,
      tags: Array(101).fill('tag')
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

  it('rejects ingest payload exceeding maximum allowed indicators (>10000)', () => {
    const data = {
      indicators: Array(10001).fill({ value: '1.1.1.1', type: IndicatorType.IP_ADDRESS })
    };
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

  it('rejects enrichment result with analystBrief shorter than 10 chars', () => {
    const data = {
      severity: ThreatSeverity.HIGH,
      confidenceScore: 50,
      mitreTechniques: ['T1059'],
      analystBrief: 'Short'
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

  it('validates correct filter schema with boundary confidence values', () => {
    const data = {
      search: 'test',
      severity: ThreatSeverity.HIGH,
      minConfidence: 0,
      maxConfidence: 100,
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
      expect(parsed[0].source).toBe('src');
      expect(parsed[0].tags).toEqual(['tag1', 'tag2']);
    });

    it('handles CRLF (\\r\\n) line endings correctly', () => {
      const csv = "value,type,source,tags\r\n1.1.1.1,IP_ADDRESS,src,tag1;tag2\r\n2.2.2.2,DOMAIN,src2,tag3";
      const parsed = parseCSVPayload(csv);
      expect(parsed.length).toBe(2);
      expect(parsed[0].value).toBe('1.1.1.1');
      expect(parsed[0].type).toBe(IndicatorType.IP_ADDRESS);
      expect(parsed[1].value).toBe('2.2.2.2');
      expect(parsed[1].type).toBe(IndicatorType.DOMAIN);
    });

    it('handles uppercase and mixed-case headers and varying column order', () => {
      const csv = `TAGS,SOURCE,TYPE,VALUE\ntagA;tagB,sourceX,URL,HTTPS://EXAMPLE.COM/PATH`;
      const parsed = parseCSVPayload(csv);
      expect(parsed.length).toBe(1);
      expect(parsed[0].value).toBe('HTTPS://EXAMPLE.COM/PATH');
      expect(parsed[0].type).toBe(IndicatorType.URL);
      expect(parsed[0].source).toBe('sourceX');
      expect(parsed[0].tags).toEqual(['tagA', 'tagB']);
    });

    it('returns empty array for empty CSV or whitespace-only CSV', () => {
      expect(parseCSVPayload('')).toEqual([]);
      expect(parseCSVPayload('   \n  \n\r\n  ')).toEqual([]);
    });

    it('defaults to DOMAIN if type is invalid', () => {
      const csv = `value,type\nmalicious.com,INVALID_TYPE`;
      const parsed = parseCSVPayload(csv);
      expect(parsed[0].type).toBe(IndicatorType.DOMAIN);
    });

    it('handles missing optional fields in rows', () => {
      const csv = `value,type\n1.1.1.1,IP_ADDRESS`;
      const parsed = parseCSVPayload(csv);
      expect(parsed[0].source).toBeUndefined();
      expect(parsed[0].tags).toEqual([]);
    });

    it('ignores empty/blank lines and lines with empty value', () => {
      const csv = "value,type\n\n,IP_ADDRESS\n   \n10.0.0.1,IP_ADDRESS\n";
      const parsed = parseCSVPayload(csv);
      expect(parsed.length).toBe(1);
      expect(parsed[0].value).toBe('10.0.0.1');
    });

    it('filters out rows exceeding field max lengths', () => {
      const longValue = 'a'.repeat(2049);
      const longSource = 'b'.repeat(257);
      const longTags = 'c'.repeat(10001);
      const csv = `value,type,source,tags\n${longValue},DOMAIN,src,tag\nvalid.com,DOMAIN,${longSource},tag\nvalid2.com,DOMAIN,src,${longTags}\nvalid3.com,DOMAIN,src,validtag`;
      const parsed = parseCSVPayload(csv);
      expect(parsed.length).toBe(1);
      expect(parsed[0].value).toBe('valid3.com');
    });
  });
});
