import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { calcAvgRating, slugify } from '../utils/helpers';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';

// ── Public endpoints ──────────────────────────────────────────────────────────

export async function getProducts(req: Request, res: Response) {
  const {
    page = '1',
    limit = '12',
    category,
    brand,
    skinType,
    concern,
    minPrice,
    maxPrice,
    sort = 'popular',
    search,
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
  };

  if (category) {
    where.category = { slug: category as string };
  }

  if (brand) {
    where.brand = { slug: brand as string };
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice as string);
    if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
  if (sort === 'price_asc') orderBy = { price: 'asc' };
  if (sort === 'price_desc') orderBy = { price: 'desc' };
  if (sort === 'newest') orderBy = { createdAt: 'desc' };
  if (sort === 'popular') orderBy = { orderItems: { _count: 'desc' } };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        reviews: { select: { rating: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const productsWithMeta = products.map((product) => ({
    ...product,
    avgRating: calcAvgRating(product.reviews),
    reviewCount: product.reviews.length,
    reviews: undefined,
  }));

  res.json({
    status: 'success',
    data: {
      products: productsWithMeta,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
}

export async function getProductBySlug(req: Request, res: Response) {
  const { slug } = req.params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
      reviews: {
        where: { isApproved: true },
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!product) {
    return res.status(404).json({ status: 'error', message: 'Product not found' });
  }

  res.json({
    status: 'success',
    data: {
      product: {
        ...product,
        avgRating: calcAvgRating(product.reviews),
        reviewCount: product.reviews.length,
      },
    },
  });
}

/**
 * GET /api/products/:slug/related?limit=
 * Return a curated set of similar products for "You May Also Like" / related
 * carousels. Matching is based on shared category, concerns, and skin types,
 * with a fallback to the same category when few close matches exist.
 * The current product is always excluded.
 */
export async function getRelatedProducts(req: Request, res: Response) {
  const { slug } = req.params;
  const limit = Math.min(parseInt((req.query.limit as string) || '8'), 12);

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      categoryId: true,
      brandId: true,
      concerns: true,
      skinTypes: true,
      isFeatured: true,
    },
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const include = {
    brand: { select: { id: true, name: true, slug: true } },
    category: { select: { id: true, name: true, slug: true } },
    images: { take: 1, orderBy: { sortOrder: 'asc' } },
    reviews: { select: { rating: true } },
  } as const;

  // Candidates: same category, OR shares a concern/skin-type, same brand as a
  // weaker signal. Always active and not the product itself.
  const candidates = await prisma.product.findMany({
    where: {
      id: { not: product.id },
      isActive: true,
      OR: [
        { categoryId: product.categoryId },
        { brandId: product.brandId },
        { concerns: { hasSome: product.concerns } },
        { skinTypes: { hasSome: product.skinTypes } },
      ],
    },
    include,
    take: 50,
  });

  // Score candidates for relevance.
  const scored = candidates.map((c) => {
    let score = 0;
    if (c.categoryId === product.categoryId) score += 10;
    if (c.brandId === product.brandId) score += 4;
    const sharedConcerns =
      (c.concerns || []).filter((con) => (product.concerns || []).includes(con)).length;
    score += sharedConcerns * 3;
    const sharedSkinTypes =
      (c.skinTypes || []).filter((st) => (product.skinTypes || []).includes(st)).length;
    score += sharedSkinTypes * 2;
    if (c.isFeatured) score += 1;
    return { product: c, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const enriched = scored.slice(0, limit).map(({ product: p }) => ({
    ...p,
    avgRating: calcAvgRating(p.reviews),
    reviewCount: p.reviews.length,
    reviews: undefined,
  }));

  res.json({ status: 'success', data: { products: enriched } });
}

export async function getFeaturedProducts(_req: Request, res: Response) {
  const products = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    take: 8,
    include: {
      brand: { select: { name: true, slug: true } },
      images: { take: 1, orderBy: { sortOrder: 'asc' } },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ status: 'success', data: { products } });
}

export async function getBestsellers(_req: Request, res: Response) {
  // Use DB aggregate to get top-selling products
  const topProductIds = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 8,
  });

  const productIds = topProductIds.map((item) => item.productId);

  // If no order items yet, fall back to featured products
  let products;
  if (productIds.length > 0) {
    products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: {
        brand: { select: { name: true, slug: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        reviews: { select: { rating: true } },
      },
    });
    // Preserve the sort order from the aggregate
    const idOrder = new Map(productIds.map((id, i) => [id, i]));
    products.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
  } else {
    products = await prisma.product.findMany({
      where: { isActive: true },
      take: 8,
      orderBy: { isFeatured: 'desc' },
      include: {
        brand: { select: { name: true, slug: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        reviews: { select: { rating: true } },
      },
    });
  }

  const productsWithMeta = products.map((p) => ({
    ...p,
    totalSold: topProductIds.find((t) => t.productId === p.id)?._sum.quantity ?? 0,
    avgRating: calcAvgRating(p.reviews),
    reviewCount: p.reviews.length,
    reviews: undefined,
  }));

  res.json({ status: 'success', data: { products: productsWithMeta } });
}

export async function getNewArrivals(_req: Request, res: Response) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    take: 8,
    include: {
      brand: { select: { name: true, slug: true } },
      images: { take: 1, orderBy: { sortOrder: 'asc' } },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ status: 'success', data: { products } });
}

export async function getRecommended(req: Request, res: Response) {
  const { skinType, concern, limit = '5' } = req.query;
  const limitNum = parseInt(limit as string);

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    OR: [
      { trackStock: false },
      { stock: { gt: 0 } },
    ],
  };

  if (skinType) {
    where.skinTypes = { has: skinType as string };
  }

  if (concern) {
    where.concerns = { has: concern as string };
  }

  const products = await prisma.product.findMany({
    where,
    take: limitNum,
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
      images: { take: 1, orderBy: { sortOrder: 'asc' } },
      reviews: { select: { rating: true } },
    },
    orderBy: { isFeatured: 'desc' },
  });

  const productsWithMeta = products.map((product) => ({
    ...product,
    avgRating: calcAvgRating(product.reviews),
    reviewCount: product.reviews.length,
    reviews: undefined,
  }));

  res.json({ status: 'success', data: { products: productsWithMeta } });
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/products/admin
 * List ALL products (active + inactive) with search/filter/pagination.
 */
export async function getAllProductsAdmin(req: Request, res: Response) {
  const {
    page = '1',
    limit = '20',
    search,
    category,
    brand,
    isActive,
    isFeatured,
    sort = 'newest',
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.ProductWhereInput = {};

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  if (isFeatured !== undefined) {
    where.isFeatured = isFeatured === 'true';
  }

  if (category) {
    where.categoryId = category as string;
  }

  if (brand) {
    where.brandId = brand as string;
  }

  if (search) {
    const q = search as string;
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
  if (sort === 'price_asc') orderBy = { price: 'asc' };
  if (sort === 'price_desc') orderBy = { price: 'desc' };
  if (sort === 'name') orderBy = { name: 'asc' };
  if (sort === 'stock') orderBy = { stock: 'asc' };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        _count: { select: { variants: true, reviews: true, orderItems: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    status: 'success',
    data: {
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
}

/**
 * GET /api/products/admin/:id
 * Get full product detail for admin editing.
 */
export async function getProductByIdAdmin(req: Request, res: Response) {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      brand: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { orderBy: { name: 'asc' } },
    },
  });

  if (!product) throw new AppError('Product not found', 404);

  res.json({ status: 'success', data: { product } });
}

/**
 * POST /api/products/admin
 * Create a new product with images and variants.
 */
export async function createProduct(req: AuthRequest, res: Response) {
  const {
    name, slug, description, shortDesc, price, comparePrice,
    sku, stock, trackStock, weight, isActive, isFeatured,
    skinTypes, concerns, categoryId, brandId, images, variants,
  } = req.body;

  if (!name?.trim()) throw new AppError('name is required', 400);
  if (!description?.trim()) throw new AppError('description is required', 400);
  if (!price) throw new AppError('price is required', 400);
  if (!sku?.trim()) throw new AppError('sku is required', 400);
  if (!categoryId) throw new AppError('categoryId is required', 400);
  if (!brandId) throw new AppError('brandId is required', 400);

  // Validate category and brand exist
  const [catExists, brandExists] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId } }),
    prisma.brand.findUnique({ where: { id: brandId } }),
  ]);
  if (!catExists) throw new AppError('Category not found', 404);
  if (!brandExists) throw new AppError('Brand not found', 404);

  // Check SKU uniqueness
  const skuExists = await prisma.product.findUnique({ where: { sku: sku.trim() } });
  if (skuExists) throw new AppError('A product with this SKU already exists', 400);

  const finalSlug = slug?.trim() ? slugify(slug) : slugify(name);
  const slugExists = await prisma.product.findUnique({ where: { slug: finalSlug } });
  if (slugExists) throw new AppError('A product with this slug already exists', 400);

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      slug: finalSlug,
      description: description.trim(),
      shortDesc: shortDesc?.trim() || null,
      price: parseFloat(price),
      comparePrice: comparePrice ? parseFloat(comparePrice) : null,
      sku: sku.trim(),
      stock: parseInt(stock as string) || 0,
      trackStock: trackStock ?? false,
      weight: weight ? parseFloat(weight) : null,
      isActive: isActive ?? true,
      isFeatured: isFeatured ?? false,
      skinTypes: skinTypes ?? [],
      concerns: concerns ?? [],
      categoryId,
      brandId,
      images: {
        create: (images ?? []).map((img: any, i: number) => ({
          url: img.url,
          alt: img.alt?.trim() || null,
          sortOrder: img.sortOrder ?? i,
        })),
      },
      variants: {
        create: (variants ?? []).map((v: any) => ({
          name: v.name?.trim() || 'Default',
          price: parseFloat(v.price) || parseFloat(price),
          stock: parseInt(v.stock as string) || 0,
          options: v.options ?? null,
        })),
      },
    },
    include: {
      brand: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
    },
  });

  res.status(201).json({ status: 'success', data: { product } });
}

/**
 * PUT /api/products/admin/:id
 * Update a product. Replaces images and variants wholesale.
 */
export async function updateProduct(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const {
    name, slug, description, shortDesc, price, comparePrice,
    sku, stock, trackStock, weight, isActive, isFeatured,
    skinTypes, concerns, categoryId, brandId, images, variants,
  } = req.body;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Product not found', 404);

  // Validate category and brand if changing
  if (categoryId) {
    const catExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!catExists) throw new AppError('Category not found', 404);
  }
  if (brandId) {
    const brandExists = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brandExists) throw new AppError('Brand not found', 404);
  }

  // Check SKU uniqueness if changed
  if (sku && sku.trim() !== existing.sku) {
    const skuExists = await prisma.product.findUnique({ where: { sku: sku.trim() } });
    if (skuExists) throw new AppError('A product with this SKU already exists', 400);
  }

  // Check slug uniqueness if changed
  let finalSlug = existing.slug;
  if (slug !== undefined && slug.trim() !== '') {
    finalSlug = slugify(slug);
    if (finalSlug !== existing.slug) {
      const slugExists = await prisma.product.findUnique({ where: { slug: finalSlug } });
      if (slugExists) throw new AppError('A product with this slug already exists', 400);
    }
  } else if (name !== undefined && name.trim() !== existing.name) {
    finalSlug = slugify(name);
    if (finalSlug !== existing.slug) {
      const slugExists = await prisma.product.findUnique({ where: { slug: finalSlug } });
      if (slugExists) throw new AppError('A product with this slug already exists', 400);
    }
  }

  // Build update data
  const data: Prisma.ProductUpdateInput = {};
  if (name !== undefined) data.name = name.trim();
  if (slug !== undefined || name !== undefined) data.slug = finalSlug;
  if (description !== undefined) data.description = description.trim();
  if (shortDesc !== undefined) data.shortDesc = shortDesc?.trim() || null;
  if (price !== undefined) data.price = parseFloat(price);
  if (comparePrice !== undefined) data.comparePrice = comparePrice ? parseFloat(comparePrice) : null;
  if (sku !== undefined) data.sku = sku.trim();
  if (stock !== undefined) data.stock = parseInt(stock as string);
  if (trackStock !== undefined) data.trackStock = trackStock;
  if (weight !== undefined) data.weight = weight ? parseFloat(weight) : null;
  if (isActive !== undefined) data.isActive = isActive;
  if (isFeatured !== undefined) data.isFeatured = isFeatured;
  if (skinTypes !== undefined) data.skinTypes = skinTypes;
  if (concerns !== undefined) data.concerns = concerns;
  if (categoryId) data.category = { connect: { id: categoryId } };
  if (brandId) data.brand = { connect: { id: brandId } };

  // Replace images if provided
  if (Array.isArray(images)) {
    await prisma.productImage.deleteMany({ where: { productId: id } });
    data.images = {
      create: images.map((img: any, i: number) => ({
        url: img.url,
        alt: img.alt?.trim() || null,
        sortOrder: img.sortOrder ?? i,
      })),
    };
  }

  // Replace variants if provided
  if (Array.isArray(variants)) {
    await prisma.productVariant.deleteMany({ where: { productId: id } });
    data.variants = {
      create: variants.map((v: any) => ({
        name: v.name?.trim() || 'Default',
        price: parseFloat(v.price) || parseFloat(price ?? existing.price.toString()),
        stock: parseInt(v.stock as string) || 0,
        options: v.options ?? null,
      })),
    };
  }

  const product = await prisma.product.update({
    where: { id },
    data,
    include: {
      brand: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true,
    },
  });

  res.json({ status: 'success', data: { product } });
}

/**
 * DELETE /api/products/admin/:id
 * Permanently remove a product (cascades to images/variants).
 */
export async function deleteProduct(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Product not found', 404);

  // Check if product has been ordered
  const orderCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderCount > 0) {
    throw new AppError(
      `Cannot delete "${existing.name}" — it appears in ${orderCount} order(s). Deactivate it instead.`,
      400,
    );
  }

  await prisma.product.delete({ where: { id } });

  res.json({ status: 'success', message: 'Product deleted' });
}

/**
 * PATCH /api/products/admin/:id/toggle
 * Quickly flip isActive.
 */
export async function toggleProductActive(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Product not found', 404);

  const product = await prisma.product.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  res.json({ status: 'success', data: { product } });
}

/**
 * PATCH /api/products/admin/:id/feature
 * Quickly flip isFeatured.
 */
export async function toggleProductFeatured(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Product not found', 404);

  const product = await prisma.product.update({
    where: { id },
    data: { isFeatured: !existing.isFeatured },
  });

  res.json({ status: 'success', data: { product } });
}
