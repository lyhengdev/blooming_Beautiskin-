import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';

// ── Public endpoints ──────────────────────────────────────────────────────────

/**
 * GET /api/home/settings
 * Returns all homepage CMS settings (promo banner, trust badges, social links).
 */
export async function getHomeSettings(_req: Request, res: Response) {
  const all = await prisma.homeSetting.findMany();

  const byKey = new Map(
    all.map((s) => [s.key, s.value]),
  );

  const settings = {
    promoBanner: byKey.get('promoBanner') ?? null,
    trustBadges: byKey.get('trustBadges') ?? null,
    social:      byKey.get('social')      ?? null,
  };

  res.json({ status: 'success', data: { settings } });
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

/**
 * PUT /api/home/settings
 * Body: { promoBanner?: {...}, trustBadges?: {...}, social?: {...} }
 * Upserts each provided section independently.
 */
export async function updateHomeSettings(req: AuthRequest, res: Response) {
  const { promoBanner, trustBadges, social } = req.body;

  if (promoBanner === undefined && trustBadges === undefined && social === undefined) {
    throw new AppError('Provide at least one of promoBanner, trustBadges or social', 400);
  }

  const keys = [
    ['promoBanner', promoBanner],
    ['trustBadges', trustBadges],
    ['social', social],
  ] as const;

  for (const [key, value] of keys) {
    if (value === undefined) continue;

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new AppError(`${key} must be a valid JSON object`, 400);
    }

    await prisma.homeSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  const settings = await getHomeSettingsValue();
  res.json({ status: 'success', data: { settings } });
}

async function getHomeSettingsValue() {
  const all = await prisma.homeSetting.findMany();
  const byKey = new Map(all.map((s) => [s.key, s.value]));

  return {
    promoBanner: byKey.get('promoBanner') ?? null,
    trustBadges: byKey.get('trustBadges') ?? null,
    social:      byKey.get('social')      ?? null,
  };
}