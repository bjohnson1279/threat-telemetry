import { Router, type Router as ExpressRouter } from 'express';
import indicatorsRouter from './indicators.js';

const router: ExpressRouter = Router();

router.use('/indicators', indicatorsRouter);
// Note: The prompt mentions /api/v1/ingest in indicators route, we'll map that there, or mount it here.
// Mounting ingest in indicatorsRouter is easier for sharing context.
router.use('/ingest', indicatorsRouter); 

export default router;
