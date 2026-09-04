export type SkinType = 'NORMAL' | 'DRY' | 'OILY' | 'COMBINATION' | 'SENSITIVE';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'ABA_PAY'
  | 'WING'
  | 'CREDIT_CARD'
  | 'CASH_ON_DELIVERY';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export type CouponType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc: string | null;
  price: number;
  comparePrice: number | null;
  sku: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string;
  brandId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithMeta extends Product {
  brand: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string };
  images: ProductImage[];
  avgRating: number;
  reviewCount: number;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: ProductWithMeta;
  variant?: ProductVariant;
}

export interface Cart {
  id: string;
  userId: string | null;
  sessionId: string | null;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
  options: Record<string, string> | null;
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export const SKIN_TYPES: SkinType[] = [
  'NORMAL',
  'DRY',
  'OILY',
  'COMBINATION',
  'SENSITIVE',
];

export const SKIN_CONCERNS = [
  'Acne',
  'Aging',
  'Hyperpigmentation',
  'Hydration',
  'Pores',
  'Redness',
  'Dark Circles',
  'Dullness',
] as const;

export const CAMBODIAN_PROVINCES = [
  'Phnom Penh',
  'Banteay Meanchey',
  'Battambang',
  'Kampong Cham',
  'Kampong Chhnang',
  'Kampong Speu',
  'Kampong Thom',
  'Kampot',
  'Kandal',
  'Koh Kong',
  'Kratie',
  'Mondulkiri',
  'Pailin',
  'Preah Vihear',
  'Prey Veng',
  'Pursat',
  'Ratanakiri',
  'Siem Reap',
  'Sihanoukville',
  'Stung Treng',
  'Svay Rieng',
  'Takeo',
  'Tboung Khmum',
];
