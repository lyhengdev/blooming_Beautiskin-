import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';

/**
 * GET /api/payments/:orderId
 * Return payment status for a given order.
 *
 * Protected: the requester must own the order, or be an ADMIN.
 */
export async function getPaymentStatus(req: AuthRequest, res: Response) {
  const { orderId } = req.params;

  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true },
  });

  if (!order) {
    throw new AppError('Payment not found', 404);
  }

  // Ownership check — prevent IDOR (accessing another user's payment status).
  const isAdmin = req.user.role === 'ADMIN';
  if (!isAdmin && order.userId !== req.user.id) {
    throw new AppError('Forbidden', 403);
  }

  const payment = await prisma.payment.findUnique({
    where: { orderId },
  });

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  res.json({ status: 'success', data: { payment } });
}
