import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';

export async function submitContact(req: Request, res: Response) {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    throw new AppError('All fields are required', 400);
  }

  await prisma.contactMessage.create({
    data: { name, email, subject, message },
  });

  res.status(201).json({
    status: 'success',
    message: 'Message received. We will get back to you soon.',
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getAllMessagesAdmin(req: Request, res: Response) {
  const { page = '1', limit = '20', unread } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (unread === 'true') where.isRead = false;
  else if (unread === 'false') where.isRead = true;

  const [messages, total] = await Promise.all([
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
    prisma.contactMessage.count({ where }),
  ]);

  res.json({
    status: 'success',
    data: { messages, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } },
  });
}

export async function markAsRead(req: Request, res: Response) {
  const { id } = req.params;
  const msg = await prisma.contactMessage.findUnique({ where: { id } });
  if (!msg) throw new AppError('Message not found', 404);
  const updated = await prisma.contactMessage.update({ where: { id }, data: { isRead: true } });
  res.json({ status: 'success', data: { message: updated } });
}

export async function markAsUnread(req: Request, res: Response) {
  const { id } = req.params;
  const msg = await prisma.contactMessage.findUnique({ where: { id } });
  if (!msg) throw new AppError('Message not found', 404);
  const updated = await prisma.contactMessage.update({ where: { id }, data: { isRead: false } });
  res.json({ status: 'success', data: { message: updated } });
}

export async function deleteMessage(req: Request, res: Response) {
  const { id } = req.params;
  const msg = await prisma.contactMessage.findUnique({ where: { id } });
  if (!msg) throw new AppError('Message not found', 404);
  await prisma.contactMessage.delete({ where: { id } });
  res.json({ status: 'success', message: 'Message deleted' });
}

export async function getUnreadCount(_req: Request, res: Response) {
  const count = await prisma.contactMessage.count({ where: { isRead: false } });
  res.json({ status: 'success', data: { count } });
}
