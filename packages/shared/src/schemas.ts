import { z } from 'zod';
import { IndicatorType, ThreatSeverity } from './types.js';
import type { RawIndicator } from './types.js';

export const indicatorTypeSchema = z.nativeEnum(IndicatorType);
export const threatSeveritySchema = z.nativeEnum(ThreatSeverity);

export const rawIndicatorSchema = z.object({
  value: z.string().min(1).max(2048),
  type: indicatorTypeSchema,
  source: z.string().max(256).optional(),
  tags: z.array(z.string().max(256)).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
  rawPayload: z.record(z.unknown()).optional(),
});

export const ingestPayloadSchema = z.object({
  indicators: z.array(rawIndicatorSchema).min(1).max(10000),
});

export const enrichmentResultSchema = z.object({
  severity: threatSeveritySchema,
  confidenceScore: z.number().int().min(0).max(100),
  mitreTechniques: z.array(z.string().regex(/^T\d{4}(\.\d{3})?$/)),
  analystBrief: z.string().min(10).max(500),
});

export const threatIndicatorFilterSchema = z.object({
  search: z.string().max(256).optional(),
  indicatorType: indicatorTypeSchema.optional(),
  severity: threatSeveritySchema.optional(),
  minConfidence: z.coerce.number().min(0).max(100).optional(),
  maxConfidence: z.coerce.number().min(0).max(100).optional(),
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  sortBy: z.enum(['createdAt', 'confidenceScore', 'severity', 'indicatorValue']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const csvRowSchema = z.object({
  value: z.string().min(1).max(2048),
  type: z.string().max(100),
  source: z.string().max(256).optional(),
  tags: z.string().max(10000).optional(),
});

// ⚡ Bolt: [performance improvement]
// Cache Enum values in a module-level Set to prevent O(n) array allocations
// inside the parsing loop.
const VALID_INDICATOR_TYPES = new Set<string>(Object.values(IndicatorType) as string[]);

export function parseCSVPayload(csvContent: string): RawIndicator[] {
  const results: RawIndicator[] = [];
  let headers: string[] | null = null;

  let currentPos = 0;
  while (currentPos < csvContent.length) {
    let nextNewline = csvContent.indexOf('\n', currentPos);
    if (nextNewline === -1) {
      nextNewline = csvContent.length;
    }

    const line = csvContent.substring(currentPos, nextNewline).trim();
    currentPos = nextNewline + 1;

    if (line.length === 0) continue;

    if (!headers) {
      headers = line.split(',').map(h => h.trim().toLowerCase());
      continue;
    }

    const values = line.split(',').map(v => v.trim());
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (values[idx]) {
        rowObj[h] = values[idx];
      }
    });

    // ⚡ Bolt: [performance improvement]
    // Replaced expensive Zod safeParse inside the tight CSV parsing loop with native JS checks.
    // Expected impact: Drastically reduces Node.js event loop blocking and object allocation overhead for large datasets.
    const value = rowObj.value;
    const type = rowObj.type;
    const source = rowObj.source;
    const tags = rowObj.tags;

    if (
      typeof value === 'string' && value.length >= 1 && value.length <= 2048 &&
      typeof type === 'string' && type.length <= 100 &&
      (source === undefined || (typeof source === 'string' && source.length <= 256)) &&
      (tags === undefined || (typeof tags === 'string' && tags.length <= 10000))
    ) {
      results.push({
        value,
        type: VALID_INDICATOR_TYPES.has(type) ? type as IndicatorType : IndicatorType.DOMAIN,
        source,
        tags: tags ? tags.split(';') : [],
      });
    }
  }
  return results;
}
