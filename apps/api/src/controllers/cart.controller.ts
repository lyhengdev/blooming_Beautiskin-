import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';

function getSessionId(req: Request): string {
  const id = req.headers['x-session-id'] as string | undefined;
  if (id && /^[0-9a-f-]{36}$/i.test(id)) return id;
  return randomUUID();
}

async function getEffectiveUserId(req: AuthRequest): Promise<string | null> {
  const userId = req.user?.id;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  return user ? userId : null;
}

export async function getCart(req: AuthRequest, res: Response) {
  const userId = await getEffectiveUserId(req);
  const sessionId = getSessionId(req);

  let cart = await prisma.cart.findFirst({
    where: userId ? { userId } : { sessionId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
              brand: { select: { name: true } },
            },
          },
          variant: true,
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: userId ? { userId } : { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { take: 1, orderBy: { sortOrder: 'asc' } },
                brand: { select: { name: true } },
              },
            },
            variant: true,
          },
        },
      },
    });
  }

  const subtotal = cart.items.reduce((sum, item) => {
    const price = item.variant ? Number(item.variant.price) : Number(item.product.price);
    return sum + price * item.quantity;
  }, 0);

  res.json({
    status: 'success',
    data: {
      cart: {
        ...cart,
        subtotal,
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      },
    },
  });
}

export async function addToCart(req: AuthRequest, res: Response) {
  const { productId, variantId, quantity } = req.body;
  const userId = await getEffectiveUserId(req);
  const sessionId = getSessionId(req);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });
  if (!product || !product.isActive) {
    throw new AppError('Product not found', 404);
  }

  // ── Stock check (only for tracked products) ─────────────────────────────
  if (product.trackStock) {
    const targetStock = variantId
      ? product.variants.find((v) => v.id === variantId)
      : product;

    if (!targetStock) {
      throw new AppError('Variant not found', 404);
    }

    const availableStock = 'stock' in targetStock ? targetStock.stock : 0;
    if (quantity > availableStock) {
      throw new AppError(
        `Insufficient stock. Available: ${availableStock}`,
        400,
      );
    }
  }

  let cart = await prisma.cart.findFirst({
    where: userId ? { userId } : { sessionId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: userId ? { userId } : { sessionId },
    });
  }

  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
      variantId: variantId || null,
    },
  });

  if (existingItem) {
    const newQty = existingItem.quantity + quantity;

    // Re-check stock for tracked products on quantity increase
    if (product.trackStock) {
      const targetStock = variantId
        ? product.variants.find((v) => v.id === variantId)
        : product;
      const availableStock = targetStock && 'stock' in targetStock ? targetStock.stock : 0;
      if (newQty > availableStock) {
        throw new AppError(
          `Insufficient stock. Available: ${availableStock}`,
          400,
        );
      }
    }

    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQty },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
        quantity,
      },
    });
  }

  const updatedCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
              brand: { select: { name: true } },
            },
          },
          variant: true,
        },
      },
    },
  });

  res.json({ status: 'success', data: { cart: updatedCart } });
}

export async function updateCartItem(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { quantity } = req.body;

  const item = await prisma.cartItem.findUnique({
    where: { id },
    include: { product: true, variant: true, cart: true },
  });
  if (!item) {
    throw new AppError('Cart item not found', 404);
  }

  // ── Ownership check (IDOR prevention) ──────────────────────────────────
  const userId = await getEffectiveUserId(req);
  const sessionId = getSessionId(req);
  const ownsCart = userId
    ? item.cart.userId === userId
    : item.cart.sessionId === sessionId;
  if (!ownsCart) {
    throw new AppError('Forbidden', 403);
  }

  // ── Stock check (only for tracked products) ─────────────────────────────
  if (item.product.trackStock) {
    const targetStock = item.variant ?? item.product;
    const availableStock = 'stock' in targetStock ? targetStock.stock : 0;
    if (quantity > availableStock) {
      throw new AppError(
        `Insufficient stock. Available: ${availableStock}`,
        400,
      );
    }
  }

  await prisma.cartItem.update({
    where: { id },
    data: { quantity },
  });

  res.json({ status: 'success', message: 'Cart item updated' });
}

export async function removeCartItem(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const item = await prisma.cartItem.findUnique({
    where: { id },
    include: { cart: true },
  });
  if (!item) {
    throw new AppError('Cart item not found', 404);
  }

  // ── Ownership check (IDOR prevention) ──────────────────────────────────
  const userId = await getEffectiveUserId(req);
  const sessionId = getSessionId(req);
  const ownsCart = userId
    ? item.cart.userId === userId
    : item.cart.sessionId === sessionId;
  if (!ownsCart) {
    throw new AppError('Forbidden', 403);
  }

  await prisma.cartItem.delete({ where: { id } });

  res.json({ status: 'success', message: 'Cart item removed' });
}

export async function clearCart(req: AuthRequest, res: Response) {
  const userId = await getEffectiveUserId(req);
  const sessionId = getSessionId(req);

  const cart = await prisma.cart.findFirst({
    where: userId ? { userId } : { sessionId },
  });

  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  res.json({ status: 'success', message: 'Cart cleared' });
}
