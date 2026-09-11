import { Router, Request, Response } from 'express';
import { 
  ingestPayloadSchema, 
  threatIndicatorFilterSchema,
  normalizeIndicatorValue,
  chunkArray,
  parseCSVPayload
} from '@threat-telemetry/shared';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { ThreatEnrichmentService } from '../services/enrichment.js';
import { logger } from '../lib/logger.js';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const router: Router = Router();

// Endpoint: POST /api/v1/ingest
router.post(
  '/', // When mounted at /ingest or /indicators/ingest
  async (req: Request, res: Response, next) => {
    try {
      let rawIndicators = [];
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('text/csv')) {
        const csvContent = req.body.toString();
        rawIndicators = parseCSVPayload(csvContent);
      } else {
        // Assume JSON
        const parsedBody = ingestPayloadSchema.parse(req.body);
        rawIndicators = parsedBody.indicators;
      }

      if (!rawIndicators.length) {
        res.status(400).json({ error: 'No indicators provided' });
        return;
      }

      const formattedIndicators = rawIndicators.map((ind) => ({
        indicatorValue: normalizeIndicatorValue(ind.value, ind.type),
        indicatorType: ind.type,
        severity: 'LOW',
        confidenceScore: 0,
        rawPayload: (ind as any).rawPayload || {},
        mitreTechniques: [],
      }));

      const chunks = chunkArray(formattedIndicators, 100);
      let ingestedCount = 0;
      let allIds: string[] = [];

      for (const chunk of chunks) {
        // Using Prisma create to get IDs, or createMany and query back.
        // For simplicity and getting IDs, we can use a transaction with create.
        const created = await prisma.$transaction(
          chunk.map((data) => prisma.threatIndicator.create({ data }))
        );
        ingestedCount += created.length;
        allIds.push(...created.map((c) => c.id));
      }

      res.status(201).json({
        ingested: ingestedCount,
        ids: allIds,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Endpoint: GET /api/v1/indicators
router.get(
  '/',
  validate(threatIndicatorFilterSchema, 'query'),
  async (req: Request, res: Response, next) => {
    try {
      const {
        search,
        indicatorType,
        severity,
        minConfidence,
        maxConfidence,
        page = 1,
        pageSize = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query as any;

      const where: Prisma.ThreatIndicatorWhereInput = {};

      if (search) {
        where.indicatorValue = { contains: search, mode: 'insensitive' };
      }
      if (indicatorType) {
        where.indicatorType = indicatorType;
      }
      if (severity) {
        where.severity = severity;
      }
      if (minConfidence !== undefined || maxConfidence !== undefined) {
        where.confidenceScore = {};
        if (minConfidence !== undefined) where.confidenceScore.gte = minConfidence;
        if (maxConfidence !== undefined) where.confidenceScore.lte = maxConfidence;
      }

      // ⚡ Bolt: [performance improvement]
      // Parallelize independent database queries to reduce network latency
      // Expected impact: Removes N+1 sequential delay overhead
      const [total, items] = await Promise.all([
        prisma.threatIndicator.count({ where }),
        // Sentinel: MEDIUM - Prevent arbitrary column sorting/SQLi risk
        // sortBy is strictly validated by the shared threatIndicatorFilterSchema
        // as an enum of allowed values before being used here dynamically.
        prisma.threatIndicator.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        })
      ]);

      res.json({
        data: items,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Endpoint: GET /api/v1/indicators/stats/summary
router.get('/stats/summary', async (req: Request, res: Response, next) => {
  try {
    // ⚡ Bolt: [performance improvement]
    // Parallelize independent database queries to reduce network latency
    // Expected impact: Significant reduction in response time for stats endpoint
    const [totalCount, severityGroups, typeGroups, confidenceAgg] = await Promise.all([
      prisma.threatIndicator.count(),
      prisma.threatIndicator.groupBy({
        by: ['severity'],
        _count: { severity: true },
      }),
      prisma.threatIndicator.groupBy({
        by: ['indicatorType'],
        _count: { indicatorType: true },
      }),
      prisma.threatIndicator.aggregate({
        _avg: { confidenceScore: true },
      })
    ]);

    res.json({
      totalCount,
      countBySeverity: severityGroups.reduce((acc, curr) => ({ ...acc, [curr.severity]: curr._count.severity }), {}),
      countByType: typeGroups.reduce((acc, curr) => ({ ...acc, [curr.indicatorType]: curr._count.indicatorType }), {}),
      averageConfidence: confidenceAgg._avg.confidenceScore || 0,
    });
  } catch (error) {
    next(error);
  }
});

// Endpoint: GET /api/v1/indicators/:id
router.get('/:id', validate(idParamSchema, 'params'), async (req: Request, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const indicator = await prisma.threatIndicator.findUnique({
      where: { id },
    });

    if (!indicator) {
      res.status(404).json({ error: 'Indicator not found' });
      return;
    }

    res.json(indicator);
  } catch (error) {
    next(error);
  }
});

// Endpoint: POST /api/v1/indicators/:id/enrich
router.post('/:id/enrich', validate(idParamSchema, 'params'), async (req: Request, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const indicator = await prisma.threatIndicator.findUnique({
      where: { id },
    });

    if (!indicator) {
      res.status(404).json({ error: 'Indicator not found' });
      return;
    }

    const provider = process.env.LLM_PROVIDER === 'anthropic' ? 'anthropic' : 'openai';
    const apiKey = provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: 'Enrichment service not configured (API key missing)' });
      return;
    }

    const enrichmentService = new ThreatEnrichmentService({
      provider,
      apiKey,
    });

    const result = await enrichmentService.enrich({
      value: indicator.indicatorValue,
      type: indicator.indicatorType,
      rawPayload: indicator.rawPayload,
    });

    const updated = await prisma.threatIndicator.update({
      where: { id },
      data: {
        severity: result.severity,
        confidenceScore: result.confidenceScore,
        mitreTechniques: result.mitreTechniques,
        enrichmentSummary: result.analystBrief,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
