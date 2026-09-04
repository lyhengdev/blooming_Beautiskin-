import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate, authorize } from '../middlewares/auth';
import * as bannerController from '../controllers/banner.controller';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', asyncHandler(bannerController.getActiveBanners));

// ── Admin — all require ADMIN role ────────────────────────────────────────────
router.use('/admin', authenticate, authorize('ADMIN'));

router.get('/admin', asyncHandler(bannerController.getAllBanners));

router.post(
  '/admin',
  [
    body('title').notEmpty().withMessage('title is required'),
    body('imageUrl').notEmpty().isURL({ require_tld: false }).withMessage('valid imageUrl is required'),
    body('ctaLink').optional().isString(),
    body('ctaLabel').optional().isString(),
    body('sortOrder').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
    body('startsAt').optional().isISO8601(),
    body('endsAt').optional().isISO8601(),
  ],
  validate,
  asyncHandler(bannerController.createBanner)
);

router.patch('/admin/reorder', asyncHandler(bannerController.reorderBanners));

router.put(
  '/admin/:id',
  [
    body('title').optional().notEmpty(),
    body('imageUrl').optional().isURL({ require_tld: false }),
    body('sortOrder').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
    // Allow null to clear the schedule, or a valid ISO8601 string to set it
    body('startsAt').optional({ nullable: true }).if(body('startsAt').notEmpty()).isISO8601(),
    body('endsAt').optional({ nullable: true }).if(body('endsAt').notEmpty()).isISO8601(),
  ],
  validate,
  asyncHandler(bannerController.updateBanner)
);

router.patch('/admin/:id/toggle', asyncHandler(bannerController.toggleBanner));

router.delete('/admin/:id', asyncHandler(bannerController.deleteBanner));

export default router;
