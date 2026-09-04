import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { slugify } from '../utils/helpers';

// ── Public endpoints ──────────────────────────────────────────────────────────

export async function getCategories(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } },
      children: {
        include: { _count: { select: { products: true } } },
      },
    },
    where: { parentId: null },
    orderBy: { name: 'asc' },
  });

  res.json({ status: 'success', data: { categories } });
}

export async function getCategoryBySlug(req: Request, res: Response) {
  const { slug } = req.params;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: true,
      _count: { select: { products: true } },
    },
  });

  if (!category) {
    return res.status(404).json({ status: 'error', message: 'Category not found' });
  }

  res.json({ status: 'success', data: { category } });
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/categories/admin
 * Returns ALL categories (flat list with parent info) for admin panel.
 */
export async function getAllCategoriesAdmin(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } },
      parent: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ status: 'success', data: { categories } });
}

/**
 * POST /api/categories/admin
 * Create a new category.
 */
export async function createCategory(req: AuthRequest, res: Response) {
  const { name, slug, description, image, parentId } = req.body;

  if (!name || !name.trim()) {
    throw new AppError('name is required', 400);
  }

  const finalSlug = slug && slug.trim() ? slugify(slug) : slugify(name);

  // Check slug uniqueness
  const existing = await prisma.category.findUnique({ where: { slug: finalSlug } });
  if (existing) {
    throw new AppError('A category with this slug already exists', 400);
  }

  // Validate parent if provided
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) throw new AppError('Parent category not found', 404);
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      slug: finalSlug,
      description: description?.trim() || null,
      image: image?.trim() || null,
      parentId: parentId || null,
    },
    include: {
      _count: { select: { products: true } },
      parent: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({ status: 'success', data: { category } });
}

/**
 * PUT /api/categories/admin/:id
 * Update a category.
 */
export async function updateCategory(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { name, slug, description, image, parentId } = req.body;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw new AppError('Category not found', 404);

  // Prevent setting self as parent
  if (parentId && parentId === id) {
    throw new AppError('A category cannot be its own parent', 400);
  }

  // Check slug uniqueness if changed
  let finalSlug = existing.slug;
  if (slug !== undefined && slug.trim() !== '') {
    finalSlug = slugify(slug);
    if (finalSlug !== existing.slug) {
      const slugTaken = await prisma.category.findUnique({ where: { slug: finalSlug } });
      if (slugTaken) throw new AppError('A category with this slug already exists', 400);
    }
  } else if (name !== undefined && name.trim() !== existing.name) {
    finalSlug = slugify(name);
    if (finalSlug !== existing.slug) {
      const slugTaken = await prisma.category.findUnique({ where: { slug: finalSlug } });
      if (slugTaken) throw new AppError('A category with this slug already exists', 400);
    }
  }

  // Validate parent if provided
  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) throw new AppError('Parent category not found', 404);
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(name        !== undefined && { name: name.trim() }),
      ...(slug        !== undefined && { slug: finalSlug }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(image       !== undefined && { image: image?.trim() || null }),
      ...(parentId    !== undefined && { parentId: parentId || null }),
    },
    include: {
      _count: { select: { products: true } },
      parent: { select: { id: true, name: true } },
    },
  });

  res.json({ status: 'success', data: { category } });
}

/**
 * DELETE /api/categories/admin/:id
 * Delete a category. Fails if it has products or child categories.
 */
export async function deleteCategory(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const existing = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true, children: true } },
    },
  });

  if (!existing) throw new AppError('Category not found', 404);

  if (existing._count.products > 0) {
    throw new AppError(
      `Cannot delete "${existing.name}" — it has ${existing._count.products} product(s). Reassign or remove them first.`,
      400,
    );
  }

  if (existing._count.children > 0) {
    throw new AppError(
      `Cannot delete "${existing.name}" — it has ${existing._count.children} subcategory(ies). Delete or reassign them first.`,
      400,
    );
  }

  await prisma.category.delete({ where: { id } });

  res.json({ status: 'success', message: 'Category deleted' });
}
