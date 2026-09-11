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

router.get('/addresses', authenticate, asyncHandler(authController.getAddresses));
router.post(
  '/addresses',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('street').trim().notEmpty().withMessage('Street address is required'),
    body('city').trim().notEmpty().withMessage('City or district is required'),
    body('province').trim().notEmpty().withMessage('Province is required'),
    body('isDefault').optional().isBoolean(),
  ],
  validate,
  asyncHandler(authController.createAddress)
);
router.put(
  '/addresses/:id',
  authenticate,
  [
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim().notEmpty(),
    body('street').optional().trim().notEmpty(),
    body('city').optional().trim().notEmpty(),
    body('province').optional().trim().notEmpty(),
    body('isDefault').optional().isBoolean(),
  ],
  validate,
  asyncHandler(authController.updateAddress)
);
router.patch('/addresses/:id/default', authenticate, asyncHandler(authController.setDefaultAddress));
router.delete('/addresses/:id', authenticate, asyncHandler(authController.deleteAddress));

export default router;
