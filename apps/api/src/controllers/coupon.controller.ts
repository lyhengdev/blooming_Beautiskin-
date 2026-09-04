import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';

// ── Public endpoint ───────────────────────────────────────────────────────────

export async function validateCoupon(req: Request, res: Response) {
  const { code, cartTotal } = req.body;

  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon || !coupon.isActive) {
    throw new AppError('Invalid coupon code', 400);
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new AppError('Coupon has expired', 400);
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    throw new AppError('Coupon usage limit reached', 400);
  }

  if (coupon.minOrder && cartTotal < Number(coupon.minOrder)) {
    throw new AppError(
      `Minimum order amount is $${coupon.minOrder}`,
      400
    );
  }

  let discount = 0;
  if (coupon.type === 'PERCENTAGE') {
    discount = (cartTotal * Number(coupon.value)) / 100;
  } else {
    discount = Number(coupon.value);
  }

  res.json({
    status: 'success',
    data: {
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      discount: Math.round(discount * 100) / 100,
    },
  });
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/coupons/admin
 * List all coupons with usage stats.
 */
export async function getAllCouponsAdmin(_req: Request, res: Response) {
  const coupons = await prisma.coupon.findMany({
    orderBy: { code: 'asc' },
  });

  res.json({ status: 'success', data: { coupons } });
}

/**
 * POST /api/coupons/admin
 * Create a new coupon.
 */
export async function createCoupon(req: AuthRequest, res: Response) {
  const { code, type, value, minOrder, maxUses, expiresAt, isActive } = req.body;

  if (!code?.trim()) throw new AppError('code is required', 400);
  if (!type || !['PERCENTAGE', 'FIXED_AMOUNT'].includes(type)) {
    throw new AppError('type must be PERCENTAGE or FIXED_AMOUNT', 400);
  }
  if (!value || parseFloat(value) <= 0) throw new AppError('value must be positive', 400);

  const finalCode = code.trim().toUpperCase();

  const existing = await prisma.coupon.findUnique({ where: { code: finalCode } });
  if (existing) throw new AppError('A coupon with this code already exists', 400);

  const coupon = await prisma.coupon.create({
    data: {
      code: finalCode,
      type,
      value: parseFloat(value),
      minOrder: minOrder ? parseFloat(minOrder) : null,
      maxUses: maxUses ? parseInt(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive ?? true,
    },
  });

  res.status(201).json({ status: 'success', data: { coupon } });
}

/**
 * PUT /api/coupons/admin/:id
 * Update a coupon.
 */
export async function updateCoupon(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { code, type, value, minOrder, maxUses, expiresAt, isActive } = req.body;

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new AppError('Coupon not found', 404);

  // Check code uniqueness if changed
  let finalCode = existing.code;
  if (code !== undefined && code.trim() !== '') {
    finalCode = code.trim().toUpperCase();
    if (finalCode !== existing.code) {
      const codeTaken = await prisma.coupon.findUnique({ where: { code: finalCode } });
      if (codeTaken) throw new AppError('A coupon with this code already exists', 400);
    }
  }

  if (type !== undefined && !['PERCENTAGE', 'FIXED_AMOUNT'].includes(type)) {
    throw new AppError('type must be PERCENTAGE or FIXED_AMOUNT', 400);
  }

  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      ...(code      !== undefined && { code: finalCode }),
      ...(type      !== undefined && { type }),
      ...(value     !== undefined && { value: parseFloat(value) }),
      ...(minOrder  !== undefined && { minOrder: minOrder ? parseFloat(minOrder) : null }),
      ...(maxUses   !== undefined && { maxUses: maxUses ? parseInt(maxUses) : null }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      ...(isActive  !== undefined && { isActive }),
    },
  });

  res.json({ status: 'success', data: { coupon } });
}

/**
 * PATCH /api/coupons/admin/:id/toggle
 * Flip isActive.
 */
export async function toggleCoupon(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new AppError('Coupon not found', 404);

  const coupon = await prisma.coupon.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  res.json({ status: 'success', data: { coupon } });
}

/**
 * DELETE /api/coupons/admin/:id
 * Delete a coupon.
 */
export async function deleteCoupon(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) throw new AppError('Coupon not found', 404);

  await prisma.coupon.delete({ where: { id } });

  res.json({ status: 'success', message: 'Coupon deleted' });
}
