import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { generateOrderNumber, calculateShipping } from '../utils/helpers';
import { sendTelegramMessage, sendTelegramPhoto } from '../lib/telegram';
import { renderInvoice } from '../lib/invoiceImage';
import { Prisma } from '@prisma/client';

export async function createOrder(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const {
    shippingName,
    shippingPhone,
    shippingAddress,
    shippingCity,
    shippingProvince,
    shippingNotes,
    paymentMethod = 'CASH_ON_DELIVERY',
  } = req.body;

  const cart = await prisma.cart.findFirst({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  // ── Stock validation (only for tracked products) ─────────────────────────
  const outOfStockItems: string[] = [];

  for (const item of cart.items) {
    if (!item.product.trackStock) continue;

    const availableStock = item.variant
      ? item.variant.stock
      : item.product.stock;

    if (item.quantity > availableStock) {
      outOfStockItems.push(
        `${item.product.name}${item.variant ? ` (${item.variant.name})` : ''}: requested ${item.quantity}, available ${availableStock}`,
      );
    }
  }

  if (outOfStockItems.length > 0) {
    throw new AppError(
      `Insufficient stock:\n${outOfStockItems.join('\n')}`,
      400,
    );
  }

  // ── Calculate totals ─────────────────────────────────────────────────────
  const subtotal = cart.items.reduce((sum, item) => {
    const price = item.variant ? Number(item.variant.price) : Number(item.product.price);
    return sum + price * item.quantity;
  }, 0);

  const shippingCost = calculateShipping(subtotal, shippingProvince);
  const total = subtotal + shippingCost;

  // ── Create order + decrement stock in a transaction ──────────────────────
  const order = await prisma.$transaction(async (tx) => {
    // Decrement stock for tracked products
    for (const item of cart.items) {
      if (!item.product.trackStock) continue;

      if (item.variant) {
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variant.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new AppError(
            `Insufficient stock for ${item.product.name} (${item.variant.name})`,
            400,
          );
        }
      } else {
        const updated = await tx.product.updateMany({
          where: { id: item.product.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new AppError(
            `Insufficient stock for ${item.product.name}`,
            400,
          );
        }
      }
    }

    // Create order
    const newOrder = await tx.order.create({
      data: {
        userId,
        orderNumber: generateOrderNumber(),
        subtotal,
        shippingCost,
        total,
        shippingName,
        shippingPhone,
        shippingAddress,
        shippingCity,
        shippingProvince,
        notes: shippingNotes,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.variant ? item.variant.price : item.product.price,
          })),
        },
        payment: {
          create: {
            method: paymentMethod,
            amount: total,
            status: 'PENDING',
          },
        },
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, slug: true } },
          },
        },
        payment: true,
      },
    });

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return newOrder;
  });

  // ── Send invoice photo to seller's Telegram (fire-and-forget) ──────────
  const paymentMethodLabel = order.payment?.method ?? paymentMethod;
  try {
    const invoiceData = {
      orderNumber: order.orderNumber,
      total: Number(order.total),
      shippingName: order.shippingName,
      shippingPhone: order.shippingPhone,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
      shippingProvince: order.shippingProvince,
      notes: order.notes,
      paymentMethod: paymentMethodLabel,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        price: Number(i.price),
      })),
    };
    const canvas = await renderInvoice(invoiceData);
    const pngBuffer = Buffer.from(await canvas.toBuffer('png'));
    const caption = `New order ${order.orderNumber}`;
    sendTelegramPhoto(pngBuffer, caption);
  } catch (err) {
    console.error('Failed to generate/send invoice image:', err);
    // Fallback: send plain-text invoice
    sendTelegramMessage(
      `<b>NEW ORDER — ${order.orderNumber}</b>\n` +
      `Total: $${Number(order.total).toFixed(2)}\n` +
      `Customer: ${order.shippingName}\n` +
      `Phone: ${order.shippingPhone}\n` +
      `Address: ${order.shippingAddress}, ${order.shippingCity}, ${order.shippingProvince}`,
    );
  }

  res.status(201).json({ status: 'success', data: { order } });
}

export async function getUserOrders(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const { page = '1', limit = '10' } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      skip,
      take: limitNum,
      include: {
        items: {
          include: {
            product: { select: { name: true, slug: true, images: { take: 1 } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  res.json({
    status: 'success',
    data: {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
}

export async function getOrder(req: AuthRequest, res: Response) {
  const { orderNumber } = req.params;
  const userId = req.user!.id;

  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: {
      items: {
        include: {
          product: { select: { name: true, slug: true, images: true } },
          variant: true,
        },
      },
      payment: true,
    },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  res.json({ status: 'success', data: { order } });
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const;

/**
 * GET /api/orders/admin
 * List ALL orders with filters, search, and pagination.
 */
export async function getAllOrdersAdmin(req: Request, res: Response) {
  const {
    page = '1',
    limit = '20',
    status,
    search,
    sort = 'newest',
    startDate,
    endDate,
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.OrderWhereInput = {};

  if (status) {
    where.status = status as any;
  }

  if (search) {
    const q = search as string;
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { shippingName: { contains: q, mode: 'insensitive' } },
      { shippingPhone: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }

  let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: 'desc' };
  if (sort === 'oldest') orderBy = { createdAt: 'asc' };
  if (sort === 'total_asc') orderBy = { total: 'asc' };
  if (sort === 'total_desc') orderBy = { total: 'desc' };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } } },
          },
        },
        payment: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    status: 'success',
    data: {
      orders,
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
 * GET /api/orders/admin/stats
 * Summary stats for the orders dashboard.
 */
export async function getOrderStats(req: Request, res: Response) {
  const { startDate, endDate } = req.query;

  const dateFilter: Prisma.OrderWhereInput = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.gte = new Date(startDate as string);
    if (endDate) dateFilter.createdAt.lte = new Date(endDate as string);
  }

  const [totalOrders, pendingOrders, totalRevenue, ordersByStatus] = await Promise.all([
    prisma.order.count({ where: dateFilter }),
    prisma.order.count({ where: { ...dateFilter, status: 'PENDING' } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { ...dateFilter, status: { notIn: ['CANCELLED', 'REFUNDED'] } } }),
    prisma.order.groupBy({ by: ['status'], _count: { id: true }, where: dateFilter }),
  ]);

  const statusCounts = ordersByStatus.reduce((acc, row) => {
    acc[row.status] = row._count.id;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    status: 'success',
    data: {
      totalOrders,
      pendingOrders,
      totalRevenue: Number(totalRevenue._sum.total ?? 0),
      statusCounts,
    },
  });
}

/**
 * GET /api/orders/admin/:id
 * Get full order detail for admin.
 */
export async function getOrderByIdAdmin(req: Request, res: Response) {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true, slug: true, images: { take: 1 } } },
          variant: true,
        },
      },
      payment: true,
    },
  });

  if (!order) throw new AppError('Order not found', 404);

  res.json({ status: 'success', data: { order } });
}

/**
 * POST /api/orders/admin/create
 * Admin creates an order directly (online selling / POS).
 * Accepts items array, customer info, custom delivery fee, and optional price overrides.
 */
export async function createOrderAdmin(req: AuthRequest, res: Response) {
  const {
    shippingName,
    shippingPhone,
    shippingAddress,
    shippingCity,
    shippingProvince,
    shippingNotes,
    paymentMethod = 'CASH_ON_DELIVERY',
    deliveryFee,
    userId,
    items,
  } = req.body;

  // Resolve owner: use provided customer userId, else fall back to admin's own account
  const ownerId = userId || req.user!.id;
  if (userId) {
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) throw new AppError('Customer not found', 400);
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('At least one item is required', 400);
  }

  // Fetch all products in one query
  const productIds = [...new Set(items.map((it: any) => it.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validate and build order items
  const orderItems: { productId: string; variantId?: string; quantity: number; price: number }[] = [];
  let subtotal = 0;

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw new AppError(`Product not found: ${item.productId}`, 400);
    if (!product.isActive) throw new AppError(`Product "${product.name}" is not active`, 400);

    const variant = item.variantId
      ? product.variants.find((v) => v.id === item.variantId)
      : null;
    if (item.variantId && !variant) throw new AppError(`Variant not found: ${item.variantId}`, 400);

    const price = item.overridePrice != null ? Number(item.overridePrice) : Number(variant ? variant.price : product.price);

    // Stock check
    if (product.trackStock) {
      const available = variant ? variant.stock : product.stock;
      if (item.quantity > available) {
        throw new AppError(
          `Insufficient stock for ${product.name}${variant ? ` (${variant.name})` : ''}: requested ${item.quantity}, available ${available}`,
          400,
        );
      }
    }

    orderItems.push({
      productId: item.productId,
      variantId: item.variantId || undefined,
      quantity: item.quantity,
      price,
    });
    subtotal += price * item.quantity;
  }

  const shippingCost = deliveryFee != null ? Number(deliveryFee) : 1.5;
  const total = subtotal + shippingCost;

  // Create order in a transaction
  const order = await prisma.$transaction(async (tx) => {
    // Decrement stock
    for (const item of orderItems) {
      const product = productMap.get(item.productId)!;
      if (!product.trackStock) continue;

      if (item.variantId) {
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new AppError(`Insufficient stock for ${product.name}`, 400);
        }
      } else {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new AppError(`Insufficient stock for ${product.name}`, 400);
        }
      }
    }

    const newOrder = await tx.order.create({
      data: {
        userId: ownerId,
        orderNumber: generateOrderNumber(),
        subtotal,
        shippingCost,
        total,
        shippingName,
        shippingPhone,
        shippingAddress,
        shippingCity,
        shippingProvince,
        notes: shippingNotes || null,
        status: 'CONFIRMED',
        items: {
          create: orderItems.map((it) => ({
            productId: it.productId,
            variantId: it.variantId || null,
            quantity: it.quantity,
            price: it.price.toString(),
          })),
        },
        payment: {
          create: {
            method: paymentMethod,
            amount: total,
            status: 'PENDING',
          },
        },
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, slug: true } },
            variant: true,
          },
        },
        payment: true,
      },
    });

    return newOrder;
  });

  // Send Telegram invoice (fire-and-forget)
  try {
    const invoiceData = {
      orderNumber: order.orderNumber,
      total: Number(order.total),
      shippingName: order.shippingName,
      shippingPhone: order.shippingPhone,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
      shippingProvince: order.shippingProvince,
      notes: order.notes,
      paymentMethod: paymentMethod,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        name: i.product.name + (i.variant ? ` (${i.variant.name})` : ''),
        quantity: i.quantity,
        price: Number(i.price),
      })),
    };
    const canvas = await renderInvoice(invoiceData);
    const pngBuffer = Buffer.from(await canvas.toBuffer('png'));
    sendTelegramPhoto(pngBuffer, `New order ${order.orderNumber} (Online Selling)`);
  } catch (err) {
    console.error('Failed to send admin order invoice:', err);
    sendTelegramMessage(
      `<b>NEW ORDER — ${order.orderNumber}</b> (Online Selling)\n` +
      `Total: $${Number(order.total).toFixed(2)}\n` +
      `Customer: ${order.shippingName}\n` +
      `Phone: ${order.shippingPhone}\n` +
      `Address: ${order.shippingAddress}, ${order.shippingCity}, ${order.shippingProvince}`,
    );
  }

  res.status(201).json({ status: 'success', data: { order } });
}

/**
 * PATCH /api/orders/admin/:id/status
 * Update order status with validation.
 */
export async function updateOrderStatus(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
  }

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) throw new AppError('Order not found', 404);

  // Validate status transitions
  const allowedTransitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPING', 'CANCELLED'],
    SHIPPING: ['DELIVERED', 'CANCELLED'],
    DELIVERED: ['REFUNDED'],
    CANCELLED: [],
    REFUNDED: [],
  };

  const allowed = allowedTransitions[existing.status] ?? [];
  if (!allowed.includes(status)) {
    throw new AppError(
      `Cannot transition from ${existing.status} to ${status}. Allowed: ${allowed.length > 0 ? allowed.join(', ') : 'none'}`,
      400,
    );
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: true,
      payment: true,
    },
  });

  res.json({ status: 'success', data: { order } });
}
