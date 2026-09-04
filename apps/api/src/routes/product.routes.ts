import { Router } from 'express';
import { query, body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate, authorize } from '../middlewares/auth';
import * as productController from '../controllers/product.controller';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('category').optional().isString(),
    query('brand').optional().isString(),
    query('skinType').optional().isString(),
    query('concern').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('sort').optional().isIn(['price_asc', 'price_desc', 'newest', 'popular', 'rating']),
    query('search').optional().isString(),
  ],
  validate,
  asyncHandler(productController.getProducts)
);

router.get('/featured', asyncHandler(productController.getFeaturedProducts));
router.get('/bestsellers', asyncHandler(productController.getBestsellers));
router.get('/new', asyncHandler(productController.getNewArrivals));
router.get('/recommended', asyncHandler(productController.getRecommended));

// ── Public (slug-scoped; must precede the bare /:slug catch-all) ──────────────
router.get('/:slug/related', asyncHandler(productController.getRelatedProducts));

// ── Admin — all require ADMIN role ────────────────────────────────────────────
router.use('/admin', authenticate, authorize('ADMIN'));

router.get('/admin', asyncHandler(productController.getAllProductsAdmin));

router.get('/admin/:id', asyncHandler(productController.getProductByIdAdmin));

router.post(
  '/admin',
  [
    body('name').notEmpty().withMessage('name is required'),
    body('description').notEmpty().withMessage('description is required'),
    body('price').notEmpty().isFloat({ min: 0 }).withMessage('valid price is required'),
    body('sku').notEmpty().withMessage('sku is required'),
    body('categoryId').notEmpty().withMessage('categoryId is required'),
    body('brandId').notEmpty().withMessage('brandId is required'),
    body('comparePrice').optional({ nullable: true }).isFloat({ min: 0 }),
    body('stock').optional().isInt({ min: 0 }),
    body('trackStock').optional().isBoolean(),
    body('weight').optional({ nullable: true }).isFloat({ min: 0 }),
    body('isActive').optional().isBoolean(),
    body('isFeatured').optional().isBoolean(),
    body('skinTypes').optional().isArray(),
    body('concerns').optional().isArray(),
    body('images').optional().isArray(),
    body('variants').optional().isArray(),
  ],
  validate,
  asyncHandler(productController.createProduct)
);

router.put(
  '/admin/:id',
  [
    body('name').optional().notEmpty(),
    body('description').optional().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('sku').optional().notEmpty(),
    body('categoryId').optional().notEmpty(),
    body('brandId').optional().notEmpty(),
    body('comparePrice').optional({ nullable: true }).isFloat({ min: 0 }),
    body('stock').optional().isInt({ min: 0 }),
    body('trackStock').optional().isBoolean(),
    body('weight').optional({ nullable: true }).isFloat({ min: 0 }),
    body('isActive').optional().isBoolean(),
    body('isFeatured').optional().isBoolean(),
    body('skinTypes').optional().isArray(),
    body('concerns').optional().isArray(),
    body('images').optional().isArray(),
    body('variants').optional().isArray(),
  ],
  validate,
  asyncHandler(productController.updateProduct)
);

router.delete('/admin/:id', asyncHandler(productController.deleteProduct));

router.patch('/admin/:id/toggle', asyncHandler(productController.toggleProductActive));

router.patch('/admin/:id/feature', asyncHandler(productController.toggleProductFeatured));

// ── Public (slug must be last to avoid catching /admin) ──────────────────────
router.get('/:slug', asyncHandler(productController.getProductBySlug));

export default router;
