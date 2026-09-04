import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import * as cartController from '../controllers/cart.controller';
import { authenticate, optionalAuth } from '../middlewares/auth';

const router = Router();

router.get('/', optionalAuth, asyncHandler(cartController.getCart));

router.post(
  '/items',
  optionalAuth,
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('variantId').optional().isString(),
  ],
  validate,
  asyncHandler(cartController.addToCart)
);

router.put(
  '/items/:id',
  optionalAuth,
  [
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  asyncHandler(cartController.updateCartItem)
);

router.delete('/items/:id', optionalAuth, asyncHandler(cartController.removeCartItem));
router.delete('/', optionalAuth, asyncHandler(cartController.clearCart));

export default router;
