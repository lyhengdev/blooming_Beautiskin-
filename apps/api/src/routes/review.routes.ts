import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate, authorize } from '../middlewares/auth';
import * as reviewController from '../controllers/review.controller';

const router = Router();

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/stats', authenticate, authorize('ADMIN'), asyncHandler(reviewController.getReviewStats));
router.get('/admin', authenticate, authorize('ADMIN'), asyncHandler(reviewController.getAllReviewsAdmin));
router.patch('/admin/:id/approve', authenticate, authorize('ADMIN'), asyncHandler(reviewController.toggleReviewApproval));
router.delete('/admin/:id', authenticate, authorize('ADMIN'), asyncHandler(reviewController.deleteReview));

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/product/:productId', asyncHandler(reviewController.getProductReviews));

router.post(
  '/',
  authenticate,
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('comment').optional().trim(),
  ],
  validate,
  asyncHandler(reviewController.createReview)
);

export default router;
