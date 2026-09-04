import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import * as contactController from '../controllers/contact.controller';
import { contactLimiter } from '../lib/rateLimiter';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/unread-count', authenticate, authorize('ADMIN'), asyncHandler(contactController.getUnreadCount));
router.get('/admin', authenticate, authorize('ADMIN'), asyncHandler(contactController.getAllMessagesAdmin));
router.patch('/admin/:id/read', authenticate, authorize('ADMIN'), asyncHandler(contactController.markAsRead));
router.patch('/admin/:id/unread', authenticate, authorize('ADMIN'), asyncHandler(contactController.markAsUnread));
router.delete('/admin/:id', authenticate, authorize('ADMIN'), asyncHandler(contactController.deleteMessage));

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/', contactLimiter, asyncHandler(contactController.submitContact));

export default router;
