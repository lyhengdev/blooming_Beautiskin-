import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate, authorize } from '../middlewares/auth';
import * as brandController from '../controllers/brand.controller';

const router = Router();

// ── Admin — all require ADMIN role ────────────────────────────────────────────
// Admin routes MUST come before /:slug wildcard to avoid the catch-all matching them
router.use('/admin', authenticate, authorize('ADMIN'));

router.get('/admin', asyncHandler(brandController.getAllBrandsAdmin));

router.post(
  '/admin',
  [
    body('name').notEmpty().withMessage('name is required'),
    body('slug').optional().isString(),
    body('logo').optional().isString(),
    body('description').optional().isString(),
  ],
  validate,
  asyncHandler(brandController.createBrand)
);

router.put(
  '/admin/:id',
  [
    body('name').optional().notEmpty(),
    body('slug').optional().isString(),
    body('logo').optional({ nullable: true }).isString(),
    body('description').optional({ nullable: true }).isString(),
  ],
  validate,
  asyncHandler(brandController.updateBrand)
);

router.delete('/admin/:id', asyncHandler(brandController.deleteBrand));

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', asyncHandler(brandController.getBrands));
router.get('/:slug', asyncHandler(brandController.getBrandBySlug));

export default router;
