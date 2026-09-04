import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { slugify } from '../utils/helpers';

// ── Public endpoints ──────────────────────────────────────────────────────────

export async function getPosts(req: Request, res: Response) {
  const { page = '1', limit = '10', tag } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = { publishedAt: { not: null } };
  if (tag) {
    where.tags = { has: tag as string };
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.blogPost.count({ where }),
  ]);

  res.json({
    status: 'success',
    data: {
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
}

export async function getPostBySlug(req: Request, res: Response) {
  const { slug } = req.params;

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
  });

  if (!post) {
    return res.status(404).json({ status: 'error', message: 'Post not found' });
  }

  res.json({ status: 'success', data: { post } });
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/blog/admin
 * List ALL posts (including drafts) for admin.
 */
export async function getAllPostsAdmin(req: Request, res: Response) {
  const { page = '1', limit = '20', search } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (search) {
    const q = search as string;
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { excerpt: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.blogPost.count({ where }),
  ]);

  res.json({
    status: 'success',
    data: {
      posts,
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
 * GET /api/blog/admin/:id
 * Get full post detail for admin editing.
 */
export async function getPostByIdAdmin(req: Request, res: Response) {
  const { id } = req.params;

  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
  });

  if (!post) throw new AppError('Post not found', 404);

  res.json({ status: 'success', data: { post } });
}

/**
 * POST /api/blog/admin
 * Create a new blog post (draft or publish immediately).
 */
export async function createPost(req: AuthRequest, res: Response) {
  const { title, slug, content, excerpt, coverImage, tags, publishedAt } = req.body;
  const authorId = req.user!.id;

  if (!title?.trim()) throw new AppError('title is required', 400);
  if (!content?.trim()) throw new AppError('content is required', 400);

  const finalSlug = slug?.trim() ? slugify(slug) : slugify(title);

  const slugExists = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
  if (slugExists) throw new AppError('A post with this slug already exists', 400);

  const post = await prisma.blogPost.create({
    data: {
      title: title.trim(),
      slug: finalSlug,
      content: content.trim(),
      excerpt: excerpt?.trim() || null,
      coverImage: coverImage?.trim() || null,
      authorId,
      tags: tags ?? [],
      publishedAt: publishedAt ? new Date(publishedAt) : null,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
  });

  res.status(201).json({ status: 'success', data: { post } });
}

/**
 * PUT /api/blog/admin/:id
 * Update a blog post.
 */
export async function updatePost(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { title, slug, content, excerpt, coverImage, tags, publishedAt } = req.body;

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw new AppError('Post not found', 404);

  // Check slug uniqueness if changed
  let finalSlug = existing.slug;
  if (slug !== undefined && slug.trim() !== '') {
    finalSlug = slugify(slug);
    if (finalSlug !== existing.slug) {
      const slugExists = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
      if (slugExists) throw new AppError('A post with this slug already exists', 400);
    }
  } else if (title !== undefined && title.trim() !== existing.title) {
    finalSlug = slugify(title);
    if (finalSlug !== existing.slug) {
      const slugExists = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
      if (slugExists) throw new AppError('A post with this slug already exists', 400);
    }
  }

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      ...(title       !== undefined && { title: title.trim() }),
      ...(slug        !== undefined || title !== undefined ? { slug: finalSlug } : {}),
      ...(content     !== undefined && { content: content.trim() }),
      ...(excerpt     !== undefined && { excerpt: excerpt?.trim() || null }),
      ...(coverImage  !== undefined && { coverImage: coverImage?.trim() || null }),
      ...(tags        !== undefined && { tags }),
      ...(publishedAt !== undefined && { publishedAt: publishedAt ? new Date(publishedAt) : null }),
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
  });

  res.json({ status: 'success', data: { post } });
}

/**
 * PATCH /api/blog/admin/:id/publish
 * Toggle publish/unpublish.
 */
export async function togglePublish(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw new AppError('Post not found', 404);

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      publishedAt: existing.publishedAt ? null : new Date(),
    },
  });

  res.json({ status: 'success', data: { post } });
}

/**
 * DELETE /api/blog/admin/:id
 * Delete a blog post.
 */
export async function deletePost(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw new AppError('Post not found', 404);

  await prisma.blogPost.delete({ where: { id } });

  res.json({ status: 'success', message: 'Post deleted' });
}
