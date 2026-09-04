import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { authLimiter } from '../lib/rateLimiter';

const router = Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  ],
  validate,
  asyncHandler(authController.register)
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  asyncHandler(authController.login)
);

router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.getMe));
router.put('/profile', authenticate, asyncHandler(authController.updateProfile));

export default router;
