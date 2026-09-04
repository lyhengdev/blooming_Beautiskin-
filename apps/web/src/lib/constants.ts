export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const ROUTES = {
  home: '/',
  shop: '/shop',
  product: (slug: string) => `/product/${slug}`,
  cart: '/cart',
  checkout: '/checkout',
  confirmation: '/confirmation',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  blog: '/blog',
  blogPost: (slug: string) => `/blog/${slug}`,
  about: '/about',
  contact: '/contact',
  // skinQuiz: '/skin-quiz', // DISABLED
} as const;

export const SKIN_TYPES = ['NORMAL', 'DRY', 'OILY', 'COMBINATION', 'SENSITIVE'] as const;

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

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

export const PAYMENT_METHODS = ['ABA_PAY', 'WING', 'CREDIT_CARD', 'CASH_ON_DELIVERY'] as const;

export const PRODUCTS_PER_PAGE = 12;
