import { PrismaClient } from '@prisma/client';
import { Logger } from 'pino';
import { ThreatEnrichmentService } from './services/enrichment.js';
import { MockFeedConsumer } from './services/feed-consumer.js';

export class EnrichmentWorker {
  private isRunning = false;
  private feedConsumer = new MockFeedConsumer();
  private batchSize = 5;
  private pollIntervalMs = 10000;
  private feedIntervalMs = 30000;
  
  private enrichmentTimer?: NodeJS.Timeout;
  private feedTimer?: NodeJS.Timeout;

  constructor(
    private prisma: PrismaClient,
    private enrichmentService: ThreatEnrichmentService,
    private logger: Logger
  ) {}

  async start() {
    this.isRunning = true;
    this.logger.info('Worker started');
    
    this.runEnrichmentLoop();
    this.runFeedLoop();
  }

  async stop() {
    this.isRunning = false;
    if (this.enrichmentTimer) clearTimeout(this.enrichmentTimer);
    if (this.feedTimer) clearTimeout(this.feedTimer);
    this.logger.info('Worker stopped');
  }

  private async runEnrichmentLoop() {
    if (!this.isRunning) return;

    try {
      const unenriched = await this.prisma.threatIndicator.findMany({
        where: { enrichmentSummary: null },
        take: this.batchSize,
      });

      if (unenriched.length > 0) {
        this.logger.info(`Processing batch of ${unenriched.length} indicators`);
        
        // ⚡ Bolt: [performance improvement]
        // Run external API calls concurrently, collect results, then perform DB updates sequentially.
        // Expected impact: Prevents database connection pool exhaustion (Prisma timeouts).
        const enrichmentResults = await Promise.all(
          unenriched.map(async (indicator: any) => {
            try {
              const enrichment = await this.enrichmentService.enrich({
                value: indicator.indicatorValue,
                type: indicator.indicatorType,
                rawPayload: indicator.rawPayload,
              });
              return { success: true, indicator, enrichment };
            } catch (err) {
              return { success: false, indicator, err };
            }
          })
        );

        for (const result of enrichmentResults) {
          if (result.success && result.enrichment) {
            try {
              await this.prisma.threatIndicator.update({
                where: { id: result.indicator.id },
                data: {
                  enrichmentSummary: result.enrichment.analystBrief,
                  severity: result.enrichment.severity,
                  confidenceScore: result.enrichment.confidenceScore,
                  mitreTechniques: result.enrichment.mitreTechniques,
                  lastSeen: new Date(),
                },
              });
              this.logger.info(`Enriched ${result.indicator.indicatorValue}`);
            } catch (err) {
              this.logger.error({ err, indicator: result.indicator.indicatorValue }, 'Failed to process indicator');
            }
          } else {
            this.logger.error({ err: result.err, indicator: result.indicator.indicatorValue }, 'Failed to process indicator');
          }
        }
      }
    } catch (err) {
      this.logger.error({ err }, 'Error in enrichment loop');
    }

    if (this.isRunning) {
      this.enrichmentTimer = setTimeout(() => this.runEnrichmentLoop(), this.pollIntervalMs);
    }
  }

  private async runFeedLoop() {
    if (!this.isRunning) return;

    try {
      const newIndicators = await this.feedConsumer.fetchNewIndicators();
      this.logger.info(`Fetched ${newIndicators.length} mock indicators`);

      if (newIndicators.length > 0) {
        // Bolt: Batch insert mock indicators to reduce sequential database roundtrips
        await this.prisma.threatIndicator.createMany({
          data: newIndicators.map(ind => ({
            indicatorValue: ind.value,
            indicatorType: ind.type,
            rawPayload: ind.rawPayload || {},
            lastSeen: new Date(),
          })),
        });
      }
    } catch (err) {
      this.logger.error({ err }, 'Error in feed loop');
    }

    if (this.isRunning) {
      this.feedTimer = setTimeout(() => this.runFeedLoop(), this.feedIntervalMs);
    }
  }
}
