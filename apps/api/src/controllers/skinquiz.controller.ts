import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../middlewares/auth';
import type { Response } from 'express';
import { AppError } from '../middlewares/errorHandler';
import { SmartRecommender, CONCERN_KEYWORDS } from '../lib/smartRecommender';
import { calcAvgRating } from '../utils/helpers';

const recommender = new SmartRecommender();
let isFitted = false;

async function ensureFitted(): Promise<void> {
  if (isFitted) return;
  const allProducts = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
      images: { take: 1, orderBy: { sortOrder: 'asc' } },
      reviews: { select: { rating: true } },
    },
  });
  recommender.fit(allProducts);
  isFitted = true;
}

export async function submitQuiz(req: AuthRequest, res: Response) {
  const { skinType, concerns } = req.body;
  const userId = req.user?.id;

  const validConcerns = Object.keys(CONCERN_KEYWORDS);
  const invalidConcerns = concerns.filter((c: string) => !validConcerns.includes(c));
  if (invalidConcerns.length > 0) {
    throw new AppError(`Invalid concerns: ${invalidConcerns.join(', ')}`, 400);
  }

  if (userId) {
    const existing = await prisma.skinProfile.findUnique({ where: { userId } });
    if (existing) {
      await prisma.skinProfile.update({
        where: { userId },
        data: { skinType: skinType as any, concerns },
      });
    } else {
      await prisma.skinProfile.create({
        data: { userId, skinType: skinType as any, concerns },
      });
    }
  }

  await ensureFitted();

  const candidateProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { trackStock: false },
        { stock: { gt: 0 } },
      ],
      AND: [
        {
          OR: [
            { skinTypes: { has: skinType } },
            { concerns: { hasSome: concerns } },
          ],
        },
      ],
    },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
      images: { take: 1, orderBy: { sortOrder: 'asc' } },
      reviews: { select: { rating: true } },
    },
  });

  const products = recommender.recommend(candidateProducts, skinType, concerns);

  const enriched = products.map((product) => {
    const concernMatches = concerns.filter((c: string) =>
      (product.concerns || []).some((pc) => pc.toLowerCase() === c.toLowerCase())
    );
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDesc: product.shortDesc,
      price: product.price,
      comparePrice: product.comparePrice,
      brand: product.brand,
      category: product.category,
      images: product.images,
      avgRating: calcAvgRating(product.reviews),
      reviewCount: product.reviews.length,
      skinTypes: product.skinTypes,
      concerns: product.concerns,
      matchReason: concernMatches.length > 0
        ? `Matches your ${concernMatches.slice(0, 2).join(' & ').toLowerCase()} concern${concernMatches.length > 1 ? 's' : ''}`
        : `Perfect for ${skinType.toLowerCase()} skin`,
    };
  });

  res.json({ status: 'success', data: { products: enriched } });
}

export async function getQuizHistory(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const profile = await prisma.skinProfile.findUnique({
    where: { userId: req.user.id },
  });

  res.json({
    status: 'success',
    data: { profile },
  });
}
