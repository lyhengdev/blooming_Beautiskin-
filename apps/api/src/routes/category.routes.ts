import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate, authorize } from '../middlewares/auth';
import * as categoryController from '../controllers/category.controller';

const router = Router();

// ── Admin — all require ADMIN role ────────────────────────────────────────────
// Admin routes MUST come before /:slug wildcard to avoid the catch-all matching them
router.use('/admin', authenticate, authorize('ADMIN'));

router.get('/admin', asyncHandler(categoryController.getAllCategoriesAdmin));

router.post(
  '/admin',
  [
    body('name').notEmpty().withMessage('name is required'),
    body('slug').optional().isString(),
    body('description').optional().isString(),
    body('image').optional().isString(),
    body('parentId').optional({ nullable: true }).isString(),
  ],
  validate,
  asyncHandler(categoryController.createCategory)
);

router.put(
  '/admin/:id',
  [
    body('name').optional().notEmpty(),
    body('slug').optional().isString(),
    body('description').optional({ nullable: true }).isString(),
    body('image').optional({ nullable: true }).isString(),
    body('parentId').optional({ nullable: true }).isString(),
  ],
  validate,
  asyncHandler(categoryController.updateCategory)
);

router.delete('/admin/:id', asyncHandler(categoryController.deleteCategory));

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', asyncHandler(categoryController.getCategories));
router.get('/:slug', asyncHandler(categoryController.getCategoryBySlug));

export default router;
