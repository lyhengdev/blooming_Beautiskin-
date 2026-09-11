import { Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { normalizeBarcode } from '../lib/barcode';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';

export async function lookupBarcode(req: AuthRequest, res: Response) {
  const code = normalizeBarcode(req.query.code, req.query.format);
  const barcode = await prisma.barcode.findUnique({ where: { normalizedValue: code.normalizedValue }, include: { variant: true } });
  if (!barcode) throw new AppError('Barcode not found', 404);
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: barcode.productId || barcode.variant!.productId },
    include: { images: { orderBy: { sortOrder: 'asc' } }, variants: true },
  });
  res.json({ status: 'success', data: { product, variant: barcode.variant, barcode } });
}

export async function generateBarcode(req: AuthRequest, res: Response) {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) throw new AppError('Product not found', 404);
  const variantId = req.body.variantId as string | undefined;
  if (variantId && !await prisma.productVariant.findFirst({ where: { id: variantId, productId: product.id } })) {
    throw new AppError('Variant does not belong to this product', 400);
  }
  const target = variantId ? { variantId } : { productId: product.id };
  const barcode = await prisma.$transaction(async (tx) => {
    // Serialize retries for the same item so Print always retains its identity.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`barcode:${variantId || product.id}`}))`;
    const existing = await tx.barcode.findFirst({ where: { ...target, value: { startsWith: 'BBS-' } } });
    if (existing) return existing;
    return tx.barcode.create({ data: { ...normalizeBarcode(`BBS-${randomUUID().replace(/-/g, '').slice(0, 20)}`, 'CODE_128'), ...target } });
  });
  res.json({ status: 'success', data: { barcode } });
}
