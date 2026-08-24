import * as dotenv from 'dotenv';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { EnrichmentWorker } from './worker.js';
import { ThreatEnrichmentService } from './services/enrichment.js';

dotenv.config();

const enrichmentService = new ThreatEnrichmentService({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY || '',
});

const worker = new EnrichmentWorker(prisma, enrichmentService, logger);

async function start() {
  logger.info('Starting enrichment worker...');
  await worker.start();
}

async function shutdown() {
  logger.info('Shutting down enrichment worker...');
  await worker.stop();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((err) => {
  logger.error({ err }, 'Worker failed to start');
  process.exit(1);
});
