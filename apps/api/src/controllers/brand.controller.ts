import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { slugify } from '../utils/helpers';

// ── Public endpoints ──────────────────────────────────────────────────────────

export async function getBrands(_req: Request, res: Response) {
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });

  res.json({ status: 'success', data: { brands } });
}

export async function getBrandBySlug(req: Request, res: Response) {
  const { slug } = req.params;

  const brand = await prisma.brand.findUnique({
    where: { slug },
    include: {
      products: {
        where: { isActive: true },
        include: {
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          reviews: { select: { rating: true } },
        },
      },
    },
  });

  if (!brand) {
    return res.status(404).json({ status: 'error', message: 'Brand not found' });
  }

  res.json({ status: 'success', data: { brand } });
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/brands/admin
 * Returns ALL brands with product counts for the admin panel.
 */
export async function getAllBrandsAdmin(_req: Request, res: Response) {
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });

  res.json({ status: 'success', data: { brands } });
}

/**
 * POST /api/brands/admin
 * Create a new brand.
 */
export async function createBrand(req: AuthRequest, res: Response) {
  const { name, slug, logo, description } = req.body;

  if (!name || !name.trim()) {
    throw new AppError('name is required', 400);
  }

  const finalSlug = slug && slug.trim() ? slugify(slug) : slugify(name);

  const existing = await prisma.brand.findUnique({ where: { slug: finalSlug } });
  if (existing) {
    throw new AppError('A brand with this slug already exists', 400);
  }

  const brand = await prisma.brand.create({
    data: {
      name: name.trim(),
      slug: finalSlug,
      logo: logo?.trim() || null,
      description: description?.trim() || null,
    },
    include: { _count: { select: { products: true } } },
  });

  res.status(201).json({ status: 'success', data: { brand } });
}

/**
 * PUT /api/brands/admin/:id
 * Update a brand.
 */
export async function updateBrand(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { name, slug, logo, description } = req.body;

  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) throw new AppError('Brand not found', 404);

  let finalSlug = existing.slug;
  if (slug !== undefined && slug.trim() !== '') {
    finalSlug = slugify(slug);
    if (finalSlug !== existing.slug) {
      const slugTaken = await prisma.brand.findUnique({ where: { slug: finalSlug } });
      if (slugTaken) throw new AppError('A brand with this slug already exists', 400);
    }
  } else if (name !== undefined && name.trim() !== existing.name) {
    finalSlug = slugify(name);
    if (finalSlug !== existing.slug) {
      const slugTaken = await prisma.brand.findUnique({ where: { slug: finalSlug } });
      if (slugTaken) throw new AppError('A brand with this slug already exists', 400);
    }
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: {
      ...(name        !== undefined && { name: name.trim() }),
      ...(slug        !== undefined && { slug: finalSlug }),
      ...(logo        !== undefined && { logo: logo?.trim() || null }),
      ...(description !== undefined && { description: description?.trim() || null }),
    },
    include: { _count: { select: { products: true } } },
  });

  res.json({ status: 'success', data: { brand } });
}

/**
 * DELETE /api/brands/admin/:id
 * Delete a brand. Fails if it has products.
 */
export async function deleteBrand(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const existing = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!existing) throw new AppError('Brand not found', 404);

  if (existing._count.products > 0) {
    throw new AppError(
      `Cannot delete "${existing.name}" — it has ${existing._count.products} product(s). Reassign or remove them first.`,
      400,
    );
  }

  await prisma.brand.delete({ where: { id } });

  res.json({ status: 'success', message: 'Brand deleted' });
}
