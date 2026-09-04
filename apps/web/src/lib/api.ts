import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Required so the browser sends the httpOnly auth cookie on every request
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const url = error.config?.url || '';
        const isAuthCheck = url.includes('/auth/me');
        if (!isAuthCheck) {
          const pathname = window.location.pathname;
          const isAuthPage = pathname === '/login' || pathname === '/register';
          if (!isAuthPage) {
            const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?returnTo=${returnTo}`;
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
