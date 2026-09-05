import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/errorHandler';
import { sendInvoice } from '../lib/telegram';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { phoneMatches, isPhoneLikeQuery } from '../lib/phone';

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const;

export async function getAllOrders(req: Request, res: Response) {
  const {
    page = '1',
    limit = '20',
    status,
    search,
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (status) {
    where.status = status as string;
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search as string, mode: 'insensitive' } },
      { shippingName: { contains: search as string, mode: 'insensitive' } },
      { shippingPhone: { contains: search as string } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        items: {
          include: {
            product: { select: { name: true, slug: true, images: { take: 1 } } },
          },
        },
        payment: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
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

export async function getOrderById(req: Request, res: Response) {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { name: true, slug: true, images: true } },
          variant: true,
        },
      },
      payment: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  res.json({ status: 'success', data: { order } });
}

export async function updateOrderStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status as any)) {
    throw new AppError(
      `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      400,
    );
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: status as any },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
      payment: true,
    },
  });

  // Update payment status when order is confirmed
  if (status === 'CONFIRMED' && updated.payment) {
    await prisma.payment.update({
      where: { orderId: id },
      data: { status: 'COMPLETED', paidAt: new Date() },
    });
  }

  res.json({ status: 'success', data: { order: updated } });
}

export async function sendOrderInvoice(req: Request, res: Response) {
  const { id } = req.params;
  const { showDetails = true } = req.body;

  const result = await sendInvoice(id, showDetails);

  if (!result.success) {
    throw new AppError(result.message, 400);
  }

  res.json({ status: 'success', message: result.message });
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

/**
 * GET /api/admin/stats
 * Dashboard statistics: total orders, revenue, customers, products, pending orders.
 */
export async function getDashboardStats(_req: Request, res: Response) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalOrders,
    pendingOrders,
    totalRevenue,
    totalCustomers,
    totalProducts,
    lowStockProducts,
    recentOrders,
    newCustomers30d,
    revenueLast30d,
    ordersByStatus,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.product.count(),
    prisma.product.count({ where: { trackStock: true, stock: { lte: 5 }, isActive: true } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        items: { select: { quantity: true, price: true } },
      },
    }),
    prisma.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: thirtyDaysAgo } } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
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
      totalCustomers,
      totalProducts,
      lowStockProducts,
      newCustomers30d,
      revenueLast30d: Number(revenueLast30d._sum.total ?? 0),
      statusCounts,
      recentOrders,
    },
  });
}

// ── Customer Management ──────────────────────────────────────────────────────

/**
 * GET /api/admin/customers
 * List all customers with search, pagination, and order counts.
 */
export async function getAllCustomers(req: Request, res: Response) {
  const {
    page = '1',
    limit = '20',
    search,
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.UserWhereInput = { role: 'CUSTOMER' };

  if (search) {
    const q = search as string;
    if (isPhoneLikeQuery(q)) {
      // Smart phone matching: +855/855/0/spaces variants all normalize equal.
      const phones = await prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: { id: true, phone: true },
      });
      const matchedIds = phones
        .filter((p) => p.phone && phoneMatches(p.phone, q))
        .map((p) => p.id);
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
      if (matchedIds.length) where.OR.push({ id: { in: matchedIds } });
    } else {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }
  }

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limitNum,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  // Fetch total spent for each customer
  const customerIds = customers.map((c) => c.id);
  const orderTotals = await prisma.order.groupBy({
    by: ['userId'],
    _sum: { total: true },
    where: {
      userId: { in: customerIds },
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
    },
  });

  const totalSpentMap = orderTotals.reduce((acc, row) => {
    acc[row.userId] = Number(row._sum.total ?? 0);
    return acc;
  }, {} as Record<string, number>);

  const customersWithStats = customers.map((c) => ({
    ...c,
    totalOrders: c._count.orders,
    totalSpent: totalSpentMap[c.id] ?? 0,
    _count: undefined,
  }));

  res.json({
    status: 'success',
    data: {
      customers: customersWithStats,
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
 * GET /api/admin/customers/:id
 * Get customer detail with recent orders and addresses.
 */
export async function getCustomerById(req: Request, res: Response) {
  const { id } = req.params;

  const customer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      role: true,
      createdAt: true,
      addresses: true,
      orders: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { select: { quantity: true, price: true } },
        },
      },
    },
  });

  if (!customer) throw new AppError('Customer not found', 404);
  if (customer.role !== 'CUSTOMER') throw new AppError('User is not a customer', 400);

  // Calculate total spent
  const totalResult = await prisma.order.aggregate({
    _sum: { total: true },
    where: {
      userId: id,
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
    },
  });

  res.json({
    status: 'success',
    data: {
      customer: {
        ...customer,
        totalSpent: Number(totalResult._sum.total ?? 0),
        totalOrders: customer.orders.length,
      },
    },
  });
}

/**
 * POST /api/admin/customers
 * Admin creates a customer on the fly (used by the Online Selling page when
 * a scanned/typed phone number doesn't match an existing customer).
 */
export async function createCustomer(req: Request, res: Response) {
  const { name, phone, email } = req.body ?? {};

  if (!name || !String(name).trim()) {
    throw new AppError('Customer name is required', 400);
  }

  const cleanName = String(name).trim();
  const cleanPhone = phone ? String(phone).trim() : null;
  const cleanEmail = email ? String(email).trim().toLowerCase() : null;

  // If the phone already exists (in any format), return the existing customer.
  if (cleanPhone) {
    const existing = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });
    const dup = existing.find((c) => c.phone && phoneMatches(c.phone, cleanPhone));
    if (dup) {
      res.status(200).json({ status: 'success', data: { customer: dup, alreadyExists: true } });
      return;
    }
  }

  // Generate a unique email if none provided (email column is unique).
  let finalEmail = cleanEmail;
  if (!finalEmail) {
    const base = cleanPhone?.replace(/\D/g, '') || 'walkin';
    const suffix = randomBytes(4).toString('hex');
    finalEmail = `${base}${suffix}@walkin.customer`;
  }

  // The account password is unused for admin-created walk-ins; generate a
  // random one so the row satisfies the required field.
  const hashedPassword = await bcrypt.hash(randomBytes(16).toString('hex'), 12);

  const customer = await prisma.user.create({
    data: {
      name: cleanName,
      email: finalEmail,
      phone: cleanPhone,
      password: hashedPassword,
      role: 'CUSTOMER',
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });

  res.status(201).json({ status: 'success', data: { customer } });
}
