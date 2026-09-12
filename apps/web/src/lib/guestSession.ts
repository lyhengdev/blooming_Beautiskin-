// Guest session id — lets logged-out visitors keep a persistent cart.
// Generated once and stored in localStorage, sent as `x-session-id` on every
// API request so the backend can associate guest carts and guest orders.

const STORAGE_KEY = 'blooming_guest_session';

export function getGuestSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      id = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}