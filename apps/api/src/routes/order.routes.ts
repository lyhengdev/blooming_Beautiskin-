import { Router } from 'express';
import { body, header } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import * as orderController from '../controllers/order.controller';
import { authenticate, authorize, optionalAuth } from '../middlewares/auth';

const router = Router();

// ── Admin — all require ADMIN role ────────────────────────────────────────────
router.use('/admin', authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/admin/stats', asyncHandler(orderController.getOrderStats));
router.get('/admin', asyncHandler(orderController.getAllOrdersAdmin));
router.post('/admin/create', [
  ...['shippingName', 'shippingPhone', 'shippingAddress', 'shippingCity', 'shippingProvince'].map((field) => body(field).isString().trim().notEmpty().isLength({ max: 500 })),
  body('userId').optional().isString().notEmpty(),
  body('paymentMethod').optional().isIn(['ABA_PAY', 'WING', 'CREDIT_CARD', 'CASH_ON_DELIVERY']),
  body('deliveryFee').optional().isFloat({ min: 0, max: 999999 }).toFloat(),
  body('items').isArray({ min: 1, max: 200 }),
  body('items.*.productId').isString().notEmpty(),
  body('items.*.variantId').optional().isString().notEmpty(),
  body('items.*.quantity').isInt({ min: 1, max: 99999 }).toInt(),
  body('items.*.overridePrice').optional({ nullable: true }).isFloat({ min: 0, max: 999999 }).toFloat(),
  body('items.*.expectedPrice').optional().isFloat({ min: 0, max: 999999 }).toFloat(),
  header('Idempotency-Key').optional().isUUID(),
], validate, asyncHandler(orderController.createOrderAdmin));
router.get('/admin/:id', asyncHandler(orderController.getOrderByIdAdmin));

router.patch(
  '/admin/:id/status',
  [
    body('status')
      .notEmpty()
      .isIn(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
      .withMessage('valid status is required'),
  ],
  validate,
  asyncHandler(orderController.updateOrderStatus)
);

router.delete('/admin/:id', asyncHandler(orderController.deleteOrderAdmin));

// ── User endpoints ────────────────────────────────────────────────────────────

router.post(
  '/',
  optionalAuth,
  [
    body('shippingName').trim().notEmpty().withMessage('Shipping name is required'),
    body('shippingPhone').trim().notEmpty().withMessage('Phone is required'),
    body('shippingAddress').trim().notEmpty().withMessage('Address is required'),
    body('shippingCity').trim().notEmpty().withMessage('City is required'),
    body('shippingProvince').trim().notEmpty().withMessage('Province is required'),
    body('paymentMethod')
      .optional()
      .isIn(['ABA_PAY', 'WING', 'CREDIT_CARD', 'CASH_ON_DELIVERY']),
  ],
  validate,
  asyncHandler(orderController.createOrder)
);

// ── Guest order tracking (order number + phone, no login required) ────────────
router.post(
  '/track',
  [
    body('orderNumber').trim().notEmpty().withMessage('Order number is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
  ],
  validate,
  asyncHandler(orderController.trackOrder)
);

router.get('/', authenticate, asyncHandler(orderController.getUserOrders));
router.get('/:orderNumber', authenticate, asyncHandler(orderController.getOrder));

export default router;
