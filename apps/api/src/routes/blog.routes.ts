import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate, authorize } from '../middlewares/auth';
import * as blogController from '../controllers/blog.controller';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', asyncHandler(blogController.getPosts));

// ── Admin — all require ADMIN role ────────────────────────────────────────────
router.use('/admin', authenticate, authorize('ADMIN'));

router.get('/admin', asyncHandler(blogController.getAllPostsAdmin));

router.get('/admin/:id', asyncHandler(blogController.getPostByIdAdmin));

router.post(
  '/admin',
  [
    body('title').notEmpty().withMessage('title is required'),
    body('content').notEmpty().withMessage('content is required'),
    body('slug').optional().isString(),
    body('excerpt').optional({ nullable: true }).isString(),
    body('coverImage').optional({ nullable: true }).isString(),
    body('tags').optional().isArray(),
    body('publishedAt').optional({ nullable: true }).isISO8601(),
  ],
  validate,
  asyncHandler(blogController.createPost)
);

router.put(
  '/admin/:id',
  [
    body('title').optional().notEmpty(),
    body('content').optional().notEmpty(),
    body('slug').optional().isString(),
    body('excerpt').optional({ nullable: true }).isString(),
    body('coverImage').optional({ nullable: true }).isString(),
    body('tags').optional().isArray(),
    body('publishedAt').optional({ nullable: true }).isISO8601(),
  ],
  validate,
  asyncHandler(blogController.updatePost)
);

router.patch('/admin/:id/publish', asyncHandler(blogController.togglePublish));

router.delete('/admin/:id', asyncHandler(blogController.deletePost));

// ── Public (slug must be last) ───────────────────────────────────────────────
router.get('/:slug', asyncHandler(blogController.getPostBySlug));

export default router;
