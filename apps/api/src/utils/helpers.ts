import { randomBytes } from 'crypto';

export function calcAvgRating(reviews: { rating: number }[]): number {
  if (reviews.length === 0) return 0;
  return Math.round(
    (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10,
  ) / 10;
}

export function generateOrderNumber(): string {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const randomPart = randomBytes(4).toString('hex').toUpperCase();
  return `BBS-${datePart}-${randomPart}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

// ── Delivery fee (backend source of truth) ────────────────────────────────────
export const FREE_SHIPPING_THRESHOLD = 30;

export function calculateShipping(subtotal: number, province: string): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return province === 'Phnom Penh' ? 1 : 1.5;
}
