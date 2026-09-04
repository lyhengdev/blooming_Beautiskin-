import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate, authorize } from '../middlewares/auth';
import * as homeController from '../controllers/home.controller';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/settings', asyncHandler(homeController.getHomeSettings));

// ── Admin — all require ADMIN role ────────────────────────────────────────────
router.use('/admin', authenticate, authorize('ADMIN'));

router.put('/admin/settings', asyncHandler(homeController.updateHomeSettings));

export default router;