import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';

export async function subscribe(req: Request, res: Response) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ status: 'error', message: 'Email is required' });
  }

  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
  });

  if (existing) {
    if (existing.isActive) {
      return res.json({ status: 'success', message: 'You are already subscribed!' });
    }
    await prisma.newsletterSubscriber.update({
      where: { email },
      data: { isActive: true },
    });
  } else {
    await prisma.newsletterSubscriber.create({
      data: { email },
    });
  }

  res.status(201).json({
    status: 'success',
    message: 'Subscribed successfully! Check your email for 10% off code.',
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getAllSubscribersAdmin(req: Request, res: Response) {
  const { page = '1', limit = '20', active } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (active === 'true') where.isActive = true;
  else if (active === 'false') where.isActive = false;

  const [subscribers, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
    prisma.newsletterSubscriber.count({ where }),
  ]);

  res.json({
    status: 'success',
    data: { subscribers, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } },
  });
}

export async function toggleSubscriber(req: Request, res: Response) {
  const { id } = req.params;
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  if (!sub) throw new AppError('Subscriber not found', 404);
  const updated = await prisma.newsletterSubscriber.update({ where: { id }, data: { isActive: !sub.isActive } });
  res.json({ status: 'success', data: { subscriber: updated } });
}

export async function deleteSubscriber(req: Request, res: Response) {
  const { id } = req.params;
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { id } });
  if (!sub) throw new AppError('Subscriber not found', 404);
  await prisma.newsletterSubscriber.delete({ where: { id } });
  res.json({ status: 'success', message: 'Subscriber removed' });
}

export async function getStats(_req: Request, res: Response) {
  const [total, active] = await Promise.all([
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { isActive: true } }),
  ]);
  res.json({ status: 'success', data: { total, active, inactive: total - active } });
}
