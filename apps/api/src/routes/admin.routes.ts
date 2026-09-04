import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate, authorize } from '../middlewares/auth';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/stats', asyncHandler(adminController.getDashboardStats));

// ── Customers ────────────────────────────────────────────────────────────────
router.get('/customers', asyncHandler(adminController.getAllCustomers));
router.get('/customers/:id', asyncHandler(adminController.getCustomerById));

// ── Orders (legacy, kept for backward compat) ────────────────────────────────
router.get('/orders', asyncHandler(adminController.getAllOrders));
router.get('/orders/:id', asyncHandler(adminController.getOrderById));

router.patch(
  '/orders/:id/status',
  [
    body('status').isIn(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  ],
  validate,
  asyncHandler(adminController.updateOrderStatus),
);

router.post(
  '/orders/:id/invoice',
  [
    body('showDetails').optional().isBoolean(),
  ],
  validate,
  asyncHandler(adminController.sendOrderInvoice),
);

export default router;
