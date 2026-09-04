import { create } from 'zustand';
import api from '@/lib/api';

export interface CartProduct {
  id: string;
  name: string;
  slug: string;
  price: string;
  brand: { name: string };
  images: { url: string; alt: string | null }[];
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product: CartProduct;
}

interface CartState {
  items: CartItem[];
  cartId: string | null;
  isLoading: boolean;
  subtotal: number;
  itemCount: number;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number, variantId?: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  resetCart: () => void;
}

function calcTotals(items: CartItem[]) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => {
    return sum + parseFloat(item.product.price) * item.quantity;
  }, 0);
  return { subtotal: Math.round(subtotal * 100) / 100, itemCount };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  cartId: null,
  isLoading: false,
  subtotal: 0,
  itemCount: 0,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/cart');
      const cart = res.data.data.cart;
      const totals = calcTotals(cart.items || []);
      set({
        items: cart.items || [],
        cartId: cart.id,
        ...totals,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  addToCart: async (productId, quantity = 1, variantId) => {
    set({ isLoading: true });
    try {
      await api.post('/cart/items', { productId, quantity, variantId });
      await get().fetchCart();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateQuantity: async (itemId, quantity) => {
    try {
      await api.put(`/cart/items/${itemId}`, { quantity });
      await get().fetchCart();
    } catch (error) {
      throw error;
    }
  },

  removeItem: async (itemId) => {
    try {
      await api.delete(`/cart/items/${itemId}`);
      await get().fetchCart();
    } catch (error) {
      throw error;
    }
  },

  clearCart: async () => {
    try {
      await api.delete('/cart');
      set({ items: [], cartId: null, subtotal: 0, itemCount: 0 });
    } catch (error) {
      throw error;
    }
  },

  resetCart: () => {
    set({ items: [], cartId: null, subtotal: 0, itemCount: 0 });
  },
}));
