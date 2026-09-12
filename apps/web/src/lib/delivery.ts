export const FREE_SHIPPING_THRESHOLD = 30;

/**
 * Delivery fee in USD.
 * - Free for orders at/above FREE_SHIPPING_THRESHOLD.
 * - Below it: $1.00 for Phnom Penh, $1.50 for other provinces.
 * - With no province selected (cart page), return the Phnom Penh base rate
 *   as a conservative floor; the true fee is finalized at checkout.
 */
export function getDeliveryFee(subtotal: number, province?: string): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  if (!province) return 1;
  return province === 'Phnom Penh' ? 1 : 1.5;
}

export const FREE_SHIPPING_PROMPT = (remaining: number) =>
  `Add $${remaining.toFixed(2)} more for free shipping!`;