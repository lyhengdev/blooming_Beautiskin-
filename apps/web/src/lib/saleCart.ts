export interface SaleVariant { id: string; name: string; price: string; stock: number }
export interface SaleProduct {
  id: string; name: string; slug: string; price: string; stock: number; trackStock: boolean; isActive: boolean;
  images: { id: string; url: string; alt?: string }[];
  variants?: SaleVariant[];
}
export interface SaleLine { key: string; product: SaleProduct; variant?: SaleVariant; qty: number; overridePrice: number | null }
export const linePrice = (line: SaleLine) => line.overridePrice ?? Number(line.variant?.price ?? line.product.price);

export function addSaleItem(cart: SaleLine[], product: SaleProduct, variant?: SaleVariant): SaleLine[] {
  if (!product.isActive) throw new Error(`${product.name} is inactive`);
  if (variant && !product.variants?.some((item) => item.id === variant.id)) throw new Error('Variant does not belong to this product');
  if (product.variants?.length && !variant) throw new Error('Choose a variant');
  const key = `${product.id}:${variant?.id || 'base'}`;
  const existing = cart.find((line) => line.key === key);
  const qty = (existing?.qty ?? 0) + 1;
  if (product.trackStock && qty > (variant?.stock ?? product.stock)) throw new Error(`${product.name}${variant ? ` (${variant.name})` : ''}: not enough stock`);
  if (existing) return cart.map((line) => line.key === key ? { ...line, product, variant, qty } : line);
  return [...cart, { key, product, variant, qty, overridePrice: null }];
}
