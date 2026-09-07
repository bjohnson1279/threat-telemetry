import { enrichmentResultSchema, EnrichmentResult } from '@threat-telemetry/shared';
import { logger } from '../lib/logger.js';

export interface ThreatEnrichmentConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
}

export interface EnrichmentIndicator {
  value: string;
  type: string;
  rawPayload: any;
}

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-haiku-20240307';

export class ThreatEnrichmentService {
  private config: ThreatEnrichmentConfig;

  constructor(config: ThreatEnrichmentConfig) {
    this.config = {
      ...config,
      model:
        config.model ||
        (config.provider === 'openai' ? DEFAULT_OPENAI_MODEL : DEFAULT_ANTHROPIC_MODEL),
    };
  }

  async enrich(indicator: EnrichmentIndicator): Promise<EnrichmentResult> {
    const prompt = this.buildPrompt(indicator);
    
    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      try {
        logger.info(`Enrichment attempt ${attempt + 1} for indicator ${indicator.value}`);
        
        let rawResponse: string;
        
        if (this.config.provider === 'openai') {
          rawResponse = await this.callOpenAI(prompt);
        } else {
          rawResponse = await this.callAnthropic(prompt);
        }

        const parsedJson = this.extractJSON(rawResponse);
        const result = enrichmentResultSchema.parse(parsedJson);
        
        return result;
      } catch (error) {
        logger.warn({ err: error }, `Enrichment attempt \${attempt + 1} failed`);
        attempt++;
        if (attempt >= maxRetries) {
          logger.error(`All \${maxRetries} enrichment attempts failed for \${indicator.value}`);
          break;
        }
        // Exponential backoff (fast in test environment)
        const delay = (this.config as any).retryDelayMs ?? (process.env.NODE_ENV === 'test' ? 10 : Math.pow(2, attempt) * 1000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Fallback on persistent failure
    return {
      severity: 'LOW' as any,
      confidenceScore: 10,
      mitreTechniques: [],
      analystBrief: 'Enrichment failed due to service error. Manual review required.',
    };
  }

  private buildPrompt(indicator: EnrichmentIndicator): string {
    return `Analyze the following threat indicator (IOC) and provide an assessment.
    
Indicator Type: \${indicator.type}
Indicator Value: \${indicator.value}
Additional Context: \${JSON.stringify(indicator.rawPayload)}

Return ONLY a JSON object with the following exact structure:
{
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidenceScore": number (0-100),
  "mitreTechniques": string[] (array of MITRE ATT&CK technique IDs, e.g., ["T1566", "T1059"]),
  "analystBrief": string (a concise 2-sentence summary of the threat and potential impact)
}

Do not include markdown blocks or any other text outside the JSON.`;
  }

  private extractJSON(text: string): any {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) {
      throw new Error('Failed to extract JSON from LLM response');
    }
    const jsonStr = text.slice(start, end + 1);
    return JSON.parse(jsonStr);
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer \${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: \${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async callAnthropic(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: \${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }
}
