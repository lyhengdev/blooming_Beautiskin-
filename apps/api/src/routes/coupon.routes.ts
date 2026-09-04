import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate, authorize } from '../middlewares/auth';
import { couponLimiter } from '../lib/rateLimiter';
import * as couponController from '../controllers/coupon.controller';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.post(
  '/validate',
  couponLimiter,
  [
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
    body('cartTotal').isFloat({ min: 0 }).withMessage('Cart total is required'),
  ],
  validate,
  asyncHandler(couponController.validateCoupon)
);

// ── Admin — all require ADMIN role ────────────────────────────────────────────
router.use('/admin', authenticate, authorize('ADMIN'));

router.get('/admin', asyncHandler(couponController.getAllCouponsAdmin));

router.post(
  '/admin',
  [
    body('code').trim().notEmpty().withMessage('code is required'),
    body('type').isIn(['PERCENTAGE', 'FIXED_AMOUNT']).withMessage('type must be PERCENTAGE or FIXED_AMOUNT'),
    body('value').isFloat({ min: 0.01 }).withMessage('value must be positive'),
    body('minOrder').optional({ nullable: true }).isFloat({ min: 0 }),
    body('maxUses').optional({ nullable: true }).isInt({ min: 1 }),
    body('expiresAt').optional({ nullable: true }).isISO8601(),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  asyncHandler(couponController.createCoupon)
);

router.put(
  '/admin/:id',
  [
    body('code').optional().trim().notEmpty(),
    body('type').optional().isIn(['PERCENTAGE', 'FIXED_AMOUNT']),
    body('value').optional().isFloat({ min: 0.01 }),
    body('minOrder').optional({ nullable: true }).isFloat({ min: 0 }),
    body('maxUses').optional({ nullable: true }).isInt({ min: 1 }),
    body('expiresAt').optional({ nullable: true }).isISO8601(),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  asyncHandler(couponController.updateCoupon)
);

router.patch('/admin/:id/toggle', asyncHandler(couponController.toggleCoupon));

router.delete('/admin/:id', asyncHandler(couponController.deleteCoupon));

export default router;
