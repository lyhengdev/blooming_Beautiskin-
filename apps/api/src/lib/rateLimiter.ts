import rateLimit from 'express-rate-limit';

/**
 * Global limit: protects the whole API from bursts / basic brute-force while
 * remaining generous enough for normal browsing. Tighter, purpose-built
 * limiters (auth, contact, newsletter, coupon) stack on top for sensitive paths.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { status: 'error', message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { status: 'error', message: 'Too many attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { status: 'error', message: 'Too many submissions, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { status: 'error', message: 'Too many requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const couponLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { status: 'error', message: 'Too many coupon attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
