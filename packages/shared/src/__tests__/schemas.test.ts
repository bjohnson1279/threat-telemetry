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

  describe('rawIndicatorSchema boundaries & edge cases', () => {
    it('accepts raw indicator with exactly 1 char value and exactly 2048 chars value', () => {
      expect(rawIndicatorSchema.safeParse({
        value: 'x',
        type: IndicatorType.IP_ADDRESS,
      }).success).toBe(true);

      expect(rawIndicatorSchema.safeParse({
        value: 'a'.repeat(2048),
        type: IndicatorType.DOMAIN,
      }).success).toBe(true);
    });

    it('accepts exactly 100 tags and exactly 0 tags, but rejects tag longer than 256 chars', () => {
      expect(rawIndicatorSchema.safeParse({
        value: '1.1.1.1',
        type: IndicatorType.IP_ADDRESS,
        tags: [],
      }).success).toBe(true);

      expect(rawIndicatorSchema.safeParse({
        value: '1.1.1.1',
        type: IndicatorType.IP_ADDRESS,
        tags: Array(100).fill('t'),
      }).success).toBe(true);

      expect(rawIndicatorSchema.safeParse({
        value: '1.1.1.1',
        type: IndicatorType.IP_ADDRESS,
        tags: ['a'.repeat(257)],
      }).success).toBe(false);

      expect(rawIndicatorSchema.safeParse({
        value: '1.1.1.1',
        type: IndicatorType.IP_ADDRESS,
        tags: ['a'.repeat(256)],
      }).success).toBe(true);
    });

    it('validates source length boundary (256 valid, 257 invalid)', () => {
      expect(rawIndicatorSchema.safeParse({
        value: '1.1.1.1',
        type: IndicatorType.IP_ADDRESS,
        source: 's'.repeat(256),
      }).success).toBe(true);

      expect(rawIndicatorSchema.safeParse({
        value: '1.1.1.1',
        type: IndicatorType.IP_ADDRESS,
        source: 's'.repeat(257),
      }).success).toBe(false);
    });

    it('validates metadata and rawPayload record types', () => {
      expect(rawIndicatorSchema.safeParse({
        value: '1.1.1.1',
        type: IndicatorType.IP_ADDRESS,
        metadata: { key1: 'value1', key2: 123, key3: true, key4: { nested: 'obj' }, key5: [1, 2] },
        rawPayload: { rawKey: 'rawValue' },
      }).success).toBe(true);

      // Non-object metadata
      expect(rawIndicatorSchema.safeParse({
        value: '1.1.1.1',
        type: IndicatorType.IP_ADDRESS,
        metadata: 'not-an-object' as any,
      }).success).toBe(false);
    });
  });

  describe('ingestPayloadSchema boundaries', () => {
    it('accepts boundary array size: exactly 1 and exactly 10,000 indicators', () => {
      expect(ingestPayloadSchema.safeParse({
        indicators: [{ value: '1.1.1.1', type: IndicatorType.IP_ADDRESS }],
      }).success).toBe(true);

      expect(ingestPayloadSchema.safeParse({
        indicators: Array(10000).fill({ value: '1.1.1.1', type: IndicatorType.IP_ADDRESS }),
      }).success).toBe(true);
    });
  });

  describe('enrichmentResultSchema boundaries & edge cases', () => {
    it('accepts boundary confidence scores (0 and 100) and rejects non-integer or out of bounds', () => {
      const base = {
        severity: ThreatSeverity.LOW,
        mitreTechniques: ['T1566'],
        analystBrief: 'Valid analyst brief summary.',
      };

      expect(enrichmentResultSchema.safeParse({ ...base, confidenceScore: 0 }).success).toBe(true);
      expect(enrichmentResultSchema.safeParse({ ...base, confidenceScore: 100 }).success).toBe(true);
      expect(enrichmentResultSchema.safeParse({ ...base, confidenceScore: -1 }).success).toBe(false);
      expect(enrichmentResultSchema.safeParse({ ...base, confidenceScore: 101 }).success).toBe(false);
      expect(enrichmentResultSchema.safeParse({ ...base, confidenceScore: 50.5 }).success).toBe(false);
    });

    it('accepts analystBrief boundary lengths (10 and 500 chars) and rejects 9 and 501 chars', () => {
      const base = {
        severity: ThreatSeverity.LOW,
        confidenceScore: 50,
        mitreTechniques: ['T1566'],
      };

      expect(enrichmentResultSchema.safeParse({ ...base, analystBrief: 'a'.repeat(10) }).success).toBe(true);
      expect(enrichmentResultSchema.safeParse({ ...base, analystBrief: 'a'.repeat(500) }).success).toBe(true);
      expect(enrichmentResultSchema.safeParse({ ...base, analystBrief: 'a'.repeat(9) }).success).toBe(false);
      expect(enrichmentResultSchema.safeParse({ ...base, analystBrief: 'a'.repeat(501) }).success).toBe(false);
    });

    it('strictly tests MITRE ATT&CK technique regex boundaries', () => {
      const base = {
        severity: ThreatSeverity.CRITICAL,
        confidenceScore: 90,
        analystBrief: 'Valid analyst brief summary.',
      };

      // Valid: T + 4 digits, optional dot + 3 digits
      expect(enrichmentResultSchema.safeParse({ ...base, mitreTechniques: ['T1059', 'T1059.001', 'T1566.002'] }).success).toBe(true);
      expect(enrichmentResultSchema.safeParse({ ...base, mitreTechniques: [] }).success).toBe(true);

      // Invalid technique IDs
      expect(enrichmentResultSchema.safeParse({ ...base, mitreTechniques: ['t1059'] }).success).toBe(false); // lowercase
      expect(enrichmentResultSchema.safeParse({ ...base, mitreTechniques: ['T105'] }).success).toBe(false); // 3 digits
      expect(enrichmentResultSchema.safeParse({ ...base, mitreTechniques: ['T10599'] }).success).toBe(false); // 5 digits
      expect(enrichmentResultSchema.safeParse({ ...base, mitreTechniques: ['T1059.1'] }).success).toBe(false); // 1 subtechnique digit
      expect(enrichmentResultSchema.safeParse({ ...base, mitreTechniques: ['T1059.01'] }).success).toBe(false); // 2 subtechnique digits
      expect(enrichmentResultSchema.safeParse({ ...base, mitreTechniques: ['T1059.0001'] }).success).toBe(false); // 4 subtechnique digits
      expect(enrichmentResultSchema.safeParse({ ...base, mitreTechniques: ['T1059.abc'] }).success).toBe(false); // non-digits
      expect(enrichmentResultSchema.safeParse({ ...base, mitreTechniques: ['TA0001'] }).success).toBe(false); // tactic ID
    });
  });

  describe('threatIndicatorFilterSchema boundaries & edge cases', () => {
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
      expect(threatIndicatorFilterSchema.safeParse({ minConfidence: 150 }).success).toBe(false);
      expect(threatIndicatorFilterSchema.safeParse({ minConfidence: -1 }).success).toBe(false);
      expect(threatIndicatorFilterSchema.safeParse({ maxConfidence: 101 }).success).toBe(false);
      expect(threatIndicatorFilterSchema.safeParse({ maxConfidence: -5 }).success).toBe(false);
    });

    it('validates pagination boundaries (page min 1, pageSize min 1 max 100)', () => {
      expect(threatIndicatorFilterSchema.safeParse({ page: 1, pageSize: 1 }).success).toBe(true);
      expect(threatIndicatorFilterSchema.safeParse({ page: 1000, pageSize: 100 }).success).toBe(true);
      expect(threatIndicatorFilterSchema.safeParse({ page: 0 }).success).toBe(false);
      expect(threatIndicatorFilterSchema.safeParse({ page: -1 }).success).toBe(false);
      expect(threatIndicatorFilterSchema.safeParse({ pageSize: 0 }).success).toBe(false);
      expect(threatIndicatorFilterSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    });

    it('validates search max length (256 chars)', () => {
      expect(threatIndicatorFilterSchema.safeParse({ search: 's'.repeat(256) }).success).toBe(true);
      expect(threatIndicatorFilterSchema.safeParse({ search: 's'.repeat(257) }).success).toBe(false);
    });

    it('validates sortBy and sortOrder enums', () => {
      expect(threatIndicatorFilterSchema.safeParse({ sortBy: 'createdAt', sortOrder: 'asc' }).success).toBe(true);
      expect(threatIndicatorFilterSchema.safeParse({ sortBy: 'confidenceScore', sortOrder: 'desc' }).success).toBe(true);
      expect(threatIndicatorFilterSchema.safeParse({ sortBy: 'severity' }).success).toBe(true);
      expect(threatIndicatorFilterSchema.safeParse({ sortBy: 'indicatorValue' }).success).toBe(true);
      expect(threatIndicatorFilterSchema.safeParse({ sortBy: 'invalidColumn' as any }).success).toBe(false);
      expect(threatIndicatorFilterSchema.safeParse({ sortOrder: 'sideways' as any }).success).toBe(false);
    });
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

    it('handles boundary field max lengths (value=2048, source=256, tags=10000)', () => {
      const maxVal = 'a'.repeat(2048);
      const maxSrc = 'b'.repeat(256);
      const maxTags = 'c'.repeat(10000);
      const csv = `value,type,source,tags\n${maxVal},DOMAIN,${maxSrc},${maxTags}`;
      const parsed = parseCSVPayload(csv);
      expect(parsed.length).toBe(1);
      expect(parsed[0].value).toBe(maxVal);
      expect(parsed[0].source).toBe(maxSrc);
      expect(parsed[0].tags).toEqual([maxTags]);
    });

    it('handles multiple semi-colon delimited tags in CSV', () => {
      const csv = `value,type,tags\n1.2.3.4,IP_ADDRESS,c2;malware;trojan;apt28`;
      const parsed = parseCSVPayload(csv);
      expect(parsed.length).toBe(1);
      expect(parsed[0].tags).toEqual(['c2', 'malware', 'trojan', 'apt28']);
    });

    it('handles all valid IndicatorType enum values in CSV', () => {
      const types = Object.values(IndicatorType);
      const rows = types.map((t, idx) => `item${idx}.org,${t}`).join('\n');
      const csv = `value,type\n${rows}`;
      const parsed = parseCSVPayload(csv);
      expect(parsed.length).toBe(types.length);
      for (let i = 0; i < types.length; i++) {
        expect(parsed[i].type).toBe(types[i]);
      }
    });

    it('handles extra or unrecognized columns in CSV gracefully', () => {
      const csv = `id,value,comment,type,extra\n999,10.10.10.10,suspicious,IP_ADDRESS,ignored`;
      const parsed = parseCSVPayload(csv);
      expect(parsed.length).toBe(1);
      expect(parsed[0].value).toBe('10.10.10.10');
      expect(parsed[0].type).toBe(IndicatorType.IP_ADDRESS);
    });
  });
});
