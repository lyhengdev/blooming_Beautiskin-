import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import * as orderController from '../controllers/order.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// ── Admin — all require ADMIN role ────────────────────────────────────────────
router.use('/admin', authenticate, authorize('ADMIN'));

router.get('/admin/stats', asyncHandler(orderController.getOrderStats));
router.get('/admin', asyncHandler(orderController.getAllOrdersAdmin));
router.post('/admin/create', asyncHandler(orderController.createOrderAdmin));
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

// ── User endpoints ────────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
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

router.get('/', authenticate, asyncHandler(orderController.getUserOrders));
router.get('/:orderNumber', authenticate, asyncHandler(orderController.getOrder));

export default router;
