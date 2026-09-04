import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { calcAvgRating } from '../utils/helpers';

export async function getProductReviews(req: Request, res: Response) {
  const { productId } = req.params;
  const { page = '1', limit = '10' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId, isApproved: true },
      skip,
      take: limitNum,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.count({ where: { productId, isApproved: true } }),
  ]);

  const allReviews = await prisma.review.findMany({
    where: { productId, isApproved: true },
    select: { rating: true },
  });

  const avgRating = calcAvgRating(allReviews);

  const ratingBreakdown = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: allReviews.filter((r) => r.rating === rating).length,
  }));

  res.json({
    status: 'success',
    data: {
      reviews,
      summary: {
        avgRating,
        totalReviews: total,
        ratingBreakdown,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
}

export async function createReview(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const { productId, rating, comment } = req.body;

  const existingReview = await prisma.review.findFirst({
    where: { userId, productId },
  });

  if (existingReview) {
    throw new AppError('You have already reviewed this product', 400);
  }

  const review = await prisma.review.create({
    data: {
      userId,
      productId,
      rating,
      comment,
      isApproved: true,
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  });

  res.status(201).json({ status: 'success', data: { review } });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getAllReviewsAdmin(req: Request, res: Response) {
  const { page = '1', limit = '20', status, search } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (status === 'pending') where.isApproved = false;
  else if (status === 'approved') where.isApproved = true;

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { comment: { contains: q, mode: 'insensitive' } },
      { product: { name: { contains: q, mode: 'insensitive' } } },
      { user: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        product: { select: { id: true, name: true, slug: true, images: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.count({ where }),
  ]);

  res.json({
    status: 'success',
    data: {
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
}

export async function getReviewStats(_req: Request, res: Response) {
  const [total, pending, approved] = await Promise.all([
    prisma.review.count(),
    prisma.review.count({ where: { isApproved: false } }),
    prisma.review.count({ where: { isApproved: true } }),
  ]);

  res.json({ status: 'success', data: { total, pending, approved } });
}

export async function toggleReviewApproval(req: Request, res: Response) {
  const { id } = req.params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError('Review not found', 404);

  const updated = await prisma.review.update({
    where: { id },
    data: { isApproved: !review.isApproved },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      product: { select: { id: true, name: true, slug: true, images: true } },
    },
  });

  res.json({ status: 'success', data: { review: updated } });
}

export async function deleteReview(req: Request, res: Response) {
  const { id } = req.params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new AppError('Review not found', 404);

  await prisma.review.delete({ where: { id } });

  res.json({ status: 'success', message: 'Review deleted' });
}
