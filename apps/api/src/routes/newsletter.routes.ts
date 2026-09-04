import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import * as newsletterController from '../controllers/newsletter.controller';
import { newsletterLimiter } from '../lib/rateLimiter';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/stats', authenticate, authorize('ADMIN'), asyncHandler(newsletterController.getStats));
router.get('/admin', authenticate, authorize('ADMIN'), asyncHandler(newsletterController.getAllSubscribersAdmin));
router.patch('/admin/:id/toggle', authenticate, authorize('ADMIN'), asyncHandler(newsletterController.toggleSubscriber));
router.delete('/admin/:id', authenticate, authorize('ADMIN'), asyncHandler(newsletterController.deleteSubscriber));

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/subscribe', newsletterLimiter, asyncHandler(newsletterController.subscribe));

export default router;
