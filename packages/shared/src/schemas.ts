import { z } from 'zod';
import { IndicatorType, ThreatSeverity } from './types.js';
import type { RawIndicator } from './types.js';

export const indicatorTypeSchema = z.nativeEnum(IndicatorType);
export const threatSeveritySchema = z.nativeEnum(ThreatSeverity);

export const rawIndicatorSchema = z.object({
  value: z.string().min(1).max(2048),
  type: indicatorTypeSchema,
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
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
  value: z.string().min(1),
  type: z.string(),
  source: z.string().optional(),
  tags: z.string().optional(),
});

export function parseCSVPayload(csvContent: string): RawIndicator[] {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const results: RawIndicator[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (values[idx]) {
        rowObj[h] = values[idx];
      }
    });

    const parsed = csvRowSchema.safeParse(rowObj);
    if (parsed.success) {
      const typeStr = parsed.data.type as keyof typeof IndicatorType;
      const type = IndicatorType[typeStr] || IndicatorType.DOMAIN; 
      results.push({
        value: parsed.data.value,
        type: (Object.values(IndicatorType) as string[]).includes(parsed.data.type) ? parsed.data.type as IndicatorType : IndicatorType.DOMAIN,
        source: parsed.data.source,
        tags: parsed.data.tags ? parsed.data.tags.split(';') : [],
      });
    }
  }
  return results;
}
