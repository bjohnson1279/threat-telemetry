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

    const parsed = csvRowSchema.safeParse(rowObj);
    if (parsed.success) {
      results.push({
        value: parsed.data.value,
        type: VALID_INDICATOR_TYPES.has(parsed.data.type) ? parsed.data.type as IndicatorType : IndicatorType.DOMAIN,
        source: parsed.data.source,
        tags: parsed.data.tags ? parsed.data.tags.split(';') : [],
      });
    }
  }
  return results;
}
