import { EnrichmentResult, enrichmentResultSchema, sleep } from '@threat-telemetry/shared';
import { logger } from '../lib/logger.js';

export interface EnrichmentServiceConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
}

export class ThreatEnrichmentService {
  constructor(private config: EnrichmentServiceConfig) {}

  async enrich(indicator: { value: string; type: string; rawPayload: any }): Promise<EnrichmentResult> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        logger.info({ indicator: indicator.value }, `Enriching indicator (attempt ${attempt + 1})`);
        
        // Mocking the actual fetch call for LLM based on provider
        // In a real implementation this would call OpenAI/Anthropic
        // For now, return a mock response that matches enrichmentResultSchema
        
        const mockResult = {
          severity: 'HIGH',
          confidenceScore: 85,
          mitreTechniques: ['T1059'],
          analystBrief: `Mock enrichment for ${indicator.value} via ${this.config.provider}`
        };

        // Note: enrichmentResultSchema must match these properties
        return mockResult as any;
      } catch (error) {
        attempt++;
        logger.warn({ err: error, attempt }, 'Enrichment failed, retrying...');
        if (attempt >= maxRetries) {
          logger.error({ err: error }, 'Enrichment failed after max retries');
          return {
            severity: 'LOW',
            confidenceScore: 10,
            mitreTechniques: [],
            analystBrief: 'Enrichment failed permanently'
          } as any;
        }
        await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }
    
    throw new Error('Unreachable code');
  }
}
