import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns only active banners that are within their scheduled window (if set). */
function activeNowFilter() {
  const now = new Date();
  return {
    isActive: true,
    OR: [
      { startsAt: null, endsAt: null },
      { startsAt: { lte: now }, endsAt: null },
      { startsAt: null, endsAt: { gte: now } },
      { startsAt: { lte: now }, endsAt: { gte: now } },
    ],
  };
}

// ── Public endpoints ──────────────────────────────────────────────────────────

/**
 * GET /api/banners
 * Returns all active, scheduled banners ordered by sortOrder.
 * Used by the homepage hero slider.
 */
export async function getActiveBanners(_req: Request, res: Response) {
  const banners = await prisma.banner.findMany({
    where: activeNowFilter(),
    orderBy: { sortOrder: 'asc' },
  });

  res.json({ status: 'success', data: { banners } });
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/admin/banners
 * Returns ALL banners (active + inactive) for the admin panel.
 */
export async function getAllBanners(_req: Request, res: Response) {
  const banners = await prisma.banner.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  res.json({ status: 'success', data: { banners } });
}

/**
 * POST /api/admin/banners
 * Create a new banner.
 */
export async function createBanner(req: AuthRequest, res: Response) {
  const {
    title,
    subtitle,
    imageUrl,
    ctaLabel,
    ctaLink,
    badgeText,
    bgColor,
    textColor,
    sortOrder,
    isActive,
    startsAt,
    endsAt,
  } = req.body;

  if (!title || !imageUrl) {
    throw new AppError('title and imageUrl are required', 400);
  }

  // Place new banner at the end if no sortOrder provided
  let order = sortOrder;
  if (order === undefined || order === null) {
    const last = await prisma.banner.findFirst({ orderBy: { sortOrder: 'desc' } });
    order = last ? last.sortOrder + 1 : 0;
  }

  const banner = await prisma.banner.create({
    data: {
      title,
      subtitle:   subtitle   ?? null,
      imageUrl,
      ctaLabel:   ctaLabel   ?? null,
      ctaLink:    ctaLink    ?? null,
      badgeText:  badgeText  ?? null,
      bgColor:    bgColor    ?? null,
      textColor:  textColor  ?? 'dark',
      sortOrder:  order,
      isActive:   isActive   ?? true,
      startsAt:   startsAt   ? new Date(startsAt) : null,
      endsAt:     endsAt     ? new Date(endsAt)   : null,
    },
  });

  res.status(201).json({ status: 'success', data: { banner } });
}

/**
 * PUT /api/admin/banners/:id
 * Update any field of a banner.
 */
export async function updateBanner(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const {
    title, subtitle, imageUrl, ctaLabel, ctaLink,
    badgeText, bgColor, textColor, sortOrder, isActive, startsAt, endsAt,
  } = req.body;

  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) throw new AppError('Banner not found', 404);

  const banner = await prisma.banner.update({
    where: { id },
    data: {
      ...(title      !== undefined && { title }),
      ...(subtitle   !== undefined && { subtitle }),
      ...(imageUrl   !== undefined && { imageUrl }),
      ...(ctaLabel   !== undefined && { ctaLabel }),
      ...(ctaLink    !== undefined && { ctaLink }),
      ...(badgeText  !== undefined && { badgeText }),
      ...(bgColor    !== undefined && { bgColor }),
      ...(textColor  !== undefined && { textColor }),
      ...(sortOrder  !== undefined && { sortOrder: Number(sortOrder) }),
      ...(isActive   !== undefined && { isActive }),
      ...(startsAt   !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
      ...(endsAt     !== undefined && { endsAt:   endsAt   ? new Date(endsAt)   : null }),
    },
  });

  res.json({ status: 'success', data: { banner } });
}

/**
 * PATCH /api/admin/banners/:id/toggle
 * Quickly flip isActive without a full update.
 */
export async function toggleBanner(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) throw new AppError('Banner not found', 404);

  const banner = await prisma.banner.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  res.json({ status: 'success', data: { banner } });
}

/**
 * PATCH /api/admin/banners/reorder
 * Body: { items: [{ id: string, sortOrder: number }, ...] }
 * Bulk-update sort orders in one request (drag-and-drop from admin).
 */
export async function reorderBanners(req: AuthRequest, res: Response) {
  const { items } = req.body as { items: { id: string; sortOrder: number }[] };

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('items array is required', 400);
  }

  // Run all updates in a single transaction
  await prisma.$transaction(
    items.map(({ id, sortOrder }) =>
      prisma.banner.update({ where: { id }, data: { sortOrder: Number(sortOrder) } })
    )
  );

  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });

  res.json({ status: 'success', data: { banners } });
}

/**
 * DELETE /api/admin/banners/:id
 * Permanently remove a banner.
 */
export async function deleteBanner(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) throw new AppError('Banner not found', 404);

  await prisma.banner.delete({ where: { id } });

  res.json({ status: 'success', message: 'Banner deleted' });
}
