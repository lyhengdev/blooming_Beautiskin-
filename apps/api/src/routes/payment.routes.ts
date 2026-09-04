import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth';
import * as paymentController from '../controllers/payment.controller';

const router = Router();

router.get('/:orderId', authenticate, asyncHandler(paymentController.getPaymentStatus));

export default router;
