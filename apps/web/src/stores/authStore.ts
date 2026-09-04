import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

// ── Auth session ──────────────────────────────────────────────────────────────
// The JWT is stored ONLY in an httpOnly cookie set by the API (auth.controller.ts).
// It is never placed in localStorage or a readable document cookie, so it is
// not readable by client-side JavaScript (defeats XSS token theft).
//
// * The API authenticates every request via the httpOnly cookie (withCredentials).
// * The Next.js middleware verifies the same httpOnly 'token' cookie with `jose`
//   for route protection (src/middleware.ts).
// * On page refresh, loadUser() calls /auth/me which succeeds via the cookie —
//   no localStorage needed.

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      set({ user: res.data.data.user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', data);
      set({ user: res.data.data.user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the server call fails, clean up client-side state.
    } finally {
      set({ user: null });
    }
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.data.user, isLoading: false, isInitialized: true });
    } catch {
      set({ user: null, isLoading: false, isInitialized: true });
    }
  },
}));
