import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';

export async function getWishlist(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  const wishlist = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          brand: { select: { name: true, slug: true } },
          reviews: { select: { rating: true } },
        },
      },
    },
    orderBy: { id: 'desc' },
  });

  res.json({ status: 'success', data: { wishlist } });
}

export async function addToWishlist(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const { productId } = req.params;

  const existing = await prisma.wishlist.findFirst({
    where: { userId, productId },
  });

  if (existing) {
    return res.json({ status: 'success', message: 'Already in wishlist' });
  }

  await prisma.wishlist.create({
    data: { userId, productId },
  });

  res.status(201).json({ status: 'success', message: 'Added to wishlist' });
}

export async function removeFromWishlist(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const { productId } = req.params;

  await prisma.wishlist.deleteMany({
    where: { userId, productId },
  });

  res.json({ status: 'success', message: 'Removed from wishlist' });
}
