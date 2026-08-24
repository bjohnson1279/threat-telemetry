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
        
        await Promise.allSettled(
          unenriched.map(async (indicator) => {
            try {
              const enrichment = await this.enrichmentService.enrich({
                value: indicator.value,
                type: indicator.type,
                rawPayload: indicator.rawPayload,
              });

              await this.prisma.threatIndicator.update({
                where: { id: indicator.id },
                data: {
                  enrichmentSummary: enrichment as any,
                  lastSeen: new Date(),
                },
              });
              
              this.logger.info(`Enriched ${indicator.value}`);
            } catch (err) {
              this.logger.error({ err, indicator: indicator.value }, 'Failed to process indicator');
            }
          })
        );
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

      for (const ind of newIndicators) {
        await this.prisma.threatIndicator.upsert({
          where: { value: ind.value },
          create: ind,
          update: {
            lastSeen: new Date(),
            rawPayload: ind.rawPayload,
          },
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
