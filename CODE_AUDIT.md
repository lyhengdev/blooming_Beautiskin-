# Blooming Beauty Skin — Senior Code Audit

**Date:** 2026-07-27
**Auditor:** Senior Full-Stack Developer Review
**Scope:** Full codebase — API (`apps/api/`) + Frontend (`apps/web/`)

---

## Project Overview

- **Monorepo** (pnpm + Turborepo) with `apps/web` (Next.js 14) and `apps/api` (Express + Prisma + PostgreSQL)
- ~2,400 lines API, ~6,100 lines frontend
- E-commerce skincare platform for Cambodia market

---

## P0 — Critical Bugs (Fix NOW)

### 1. Skin Quiz is 100% broken
`skinquiz.controller.ts:5` imports `../lib/smartRecommender` — **that file doesn't exist**. The entire feature crashes at runtime. The route file (`skinquiz.routes.ts:18-64`) also bypasses the controller entirely with an inline handler that references `(req as any).userId` which is never set (middleware sets `req.user`).

### 2. No stock decrement on order
`order.controller.ts:43-84` — Creates orders and deletes cart items but **never decrements product stock**. Users can buy infinite quantities of out-of-stock items. Revenue-destroying bug.

### 3. No async error handler
Every controller uses `async` but there's no `asyncHandler` wrapper. Express 4 doesn't catch async rejections — any DB error crashes the server entirely.

### 4. Payment webhook has zero authentication
`payment.controller.ts:27-34` — Accepts any POST. No signature verification. An attacker can fake payment confirmations.

### 5. IDOR vulnerability in cart
`cart.controller.ts:138-165` — Any user can update/delete any other user's cart item by guessing the item ID. No ownership check.

---

## P1 — Security Issues

| Issue | Location | Fix |
|---|---|---|
| JWT stored in localStorage + non-httpOnly cookie | `authStore.ts:32-36` | Server-set httpOnly cookie only |
| Admin middleware doesn't check role | `middleware.ts:50` | Check JWT `role` claim server-side |
| Open redirect in login | `login/page.tsx:15` | Validate `returnTo` is same-origin |
| No rate limiting | Everywhere | Add `express-rate-limit` on auth/contact/newsletter |
| No CSRF protection | All mutations | Double-submit cookie pattern |
| Hardcoded admin password in seed | `seed.ts:29,41` | Never seed defaults in production |
| No input sanitization on contact/newsletter | `contact.controller.ts`, `newsletter.controller.ts` | Sanitize before storage |
| `clearCookie` missing matching options | `auth.controller.ts:92` | Pass httpOnly, secure, sameSite, domain |

---

## P2 — Architecture Problems

### Backend

- **No service layer** — All business logic lives in controllers (PLAN.md specifies `services/`)
- **Prisma client exported from `index.ts`** — Circular dependency. Should be `lib/prisma.ts`
- **Product include block duplicated ~8 times** across controllers
- **Average rating calculated identically in 5 files** (`product.controller.ts:70-73, 119-122, 217-220`, `skinquiz.controller.ts:71-73`, `review.controller.ts:17-19`) — extract to helper
- **Zero caching** — no Redis usage despite it being in docker-compose
- **`generateOrderNumber` uses `Math.random()`** — collision risk on unique field (`helpers.ts:1-7`)
- **`optionalAuth` doesn't set `req.userId`** — skinquiz route references it anyway (`skinquiz.routes.ts:22`)
- **Circular import chain** — index imports routes, routes import controllers, controllers import index for prisma

### Frontend

- **`ProductCard` defined 3 separate times** — `app/page.tsx:66-102`, `app/brands/[slug]/page.tsx:31-63`, `app/shop/page.tsx:212-245`
- **React Query installed but never used** — every page uses raw `useEffect + useState`
- **No route groups** — `(shop)`, `(account)`, `(info)` from PLAN.md don't exist. Header/Footer remount on every navigation
- **No shadcn/ui** — zero shared UI components, everything is raw HTML + Tailwind
- **No React Hook Form + Zod** — all forms use manual `useState` validation
- **Types redefined in every file** — no shared types in `packages/shared/`
- **Every page is `'use client'`** — zero SSR/SSG, terrible for SEO
- **Social links duplicated in 3 places** — Header, Footer, Home page
- **Header/Footer manually repeated** in every page instead of using layout groups
- **`formatPrice` used inconsistently** — some pages use it, others manually format `$${value.toFixed(2)}`

---

## P3 — Performance Issues

| Issue | Location | Impact |
|---|---|---|
| Zero `next/image` usage — all `<img>` tags | Everywhere | No WebP, no lazy load, no responsive srcset. Kills LCP/CLS |
| No code splitting / dynamic imports | Checkout (298L), admin banners (441L), skin quiz (321L) | Heavy components load eagerly |
| Home page fires 6 API calls with no caching | `app/page.tsx:138-144`, `HeroBannerSlider.tsx:83` | Slow initial load on every visit |
| `getBestsellers` fetches ALL order items | `product.controller.ts:151-160` | N+1 aggregate in JS instead of SQL |
| No pagination on orders/reviews | `order.controller.ts:90-100`, `review.controller.ts:9-15` | Unbounded queries |
| No caching anywhere | All controllers | Frequently accessed data re-fetched every time |
| `env.ts` validation runs on every import | `lib/env.ts:14` | Unnecessary parsing on every render |
| `isFitted` module-level cache never invalidates | `skinquiz.controller.ts:8,22` | Stale recommendations after product changes |

---

## P4 — Missing Features vs PLAN.md (40+ items)

### Backend Missing

- [ ] Services layer (`src/services/`)
- [ ] Admin CRUD API (products, orders, users, blog, coupons, dashboard)
- [ ] Forgot/reset password flow
- [ ] Review update/delete endpoints
- [ ] Payment status endpoint (`GET /api/payments/:orderId`)
- [ ] Order status management
- [ ] Rate limiting (`express-rate-limit`)
- [ ] CSRF protection
- [ ] Payment signature verification (ABA Pay, Wing)
- [ ] Personalized recommendations endpoint
- [ ] Pagination on user orders and product reviews
- [ ] Error monitoring (Sentry)
- [ ] Logging framework (Winston/Pino)

### Frontend Missing

- [ ] PWA setup (next-pwa, manifest, service worker)
- [ ] i18n (Khmer/English via `next-intl`)
- [ ] Route groups `(shop)`, `(account)`, `(info)` with shared layouts
- [ ] shadcn/ui component library
- [ ] React Hook Form + Zod for form validation
- [ ] React Query for data fetching (provider set up but unused)
- [ ] `next/image` for all images
- [ ] Admin pages (products, orders, customers, blog, coupons)
- [ ] Dashboard tabs (skin profile, change password, addresses CRUD)
- [ ] Shop filters (concern, price range, sort dropdown)
- [ ] Quick view modal on product hover
- [ ] Blog (search, tags, comments, share buttons, related posts)
- [ ] Skin Quiz (climate question, save to profile, share results)
- [ ] Product detail (key ingredients, how to use, related products, skin type match)
- [ ] Home page (bestsellers scroll, blog preview, testimonials, Instagram feed, newsletter)
- [ ] Cart (recently viewed, undo remove toast, free shipping progress bar)
- [ ] Checkout (delivery method selection, terms checkbox, only 10/25 provinces listed)
- [ ] Dashboard (order detail view, invoice download)
- [ ] SEO (dynamic metadata, openGraph, JSON-LD structured data)
- [ ] Error monitoring (Sentry)
- [ ] Analytics (Google Analytics, Facebook Pixel)
- [ ] Privacy Policy / Terms of Service pages
- [ ] Wishlist Zustand store (API calls made directly in components)
- [ ] Custom hooks (`useCart`, `useWishlist`, `useAuth`)

---

## P5 — Code Quality Issues

### Code Duplication

- Average rating calculation duplicated 5 times
- Product include block duplicated ~8 times
- Cart include block duplicated 3 times within `cart.controller.ts`
- `ProductCard` component defined 3 times on frontend
- Social links hardcoded in 3 places
- Category lists hardcoded in 3 places
- `formatPrice` used inconsistently (sometimes function, sometimes manual)

### Missing Error Handling

- `app/page.tsx:155` — `catch {}` silently swallows errors for 5 parallel API calls
- `app/brands/page.tsx:26` — `.catch(() => {})` swallows errors
- `stores/cartStore.ts:61` — `fetchCart` catch block has no error reporting
- `app/dashboard/page.tsx:95` — Only `console.error` on data load failure
- `lib/api.ts:28-38` — 401 interceptor does full page reload instead of router push

### TypeScript Issues

- `blog.controller.ts:11` — `where: any` instead of proper Prisma type
- `skinquiz.controller.ts:40` — `skinType as any` cast bypasses enum typing
- `skinquiz.routes.ts:22` — `(req as any).userId` references non-existent property
- Product types redefined in ~10 separate files
- `any` usage where proper types exist

### Anti-Patterns

- `'use client'` on nearly every page (kills SSR/SSG/SEO)
- Prisma client as global export from index (circular dependency)
- JWT returned in both cookie AND response body (bypasses httpOnly)
- No `asyncHandler` wrapper for Express async routes
- `clearCookie` doesn't match set-cookie options
- `newsletter.controller.ts` returns inconsistent status codes (200 vs 201)
- Inline `style` for CSS animations instead of Tailwind utilities
- No keyboard accessibility for mobile menu (no focus trap, no Escape handler)

---

## What's Good

- Clean monorepo setup with Turborepo
- Prisma schema is well-designed with proper relations and cascading deletes
- Docker Compose for Postgres + Redis with health checks
- Proper `helmet`, `compression`, `morgan` middleware
- Graceful shutdown handlers (SIGTERM, SIGINT)
- Consistent error handler pattern
- Good folder structure (routes/controllers/middlewares separation)
- Proper `CORS` configuration with credentials
- Banner model with scheduled display (startsAt/endsAt)
- Cart supports both user and session-based carts

---

## Priority Fix Order

| Priority | Issue | Impact |
|----------|-------|--------|
| **P0** | Missing `lib/smartRecommender` — skin quiz crashes | Feature broken |
| **P0** | No stock decrement on order — infinite overselling | Business-critical |
| **P0** | No async error handler — server crashes on DB errors | Stability |
| **P0** | Payment webhook has no auth — fake confirmations | Security |
| **P0** | IDOR in cart item update/delete | Security |
| **P1** | JWT in localStorage + non-httpOnly cookie | Security |
| **P1** | Admin middleware doesn't check role | Security |
| **P1** | Open redirect in login | Security |
| **P1** | No rate limiting on auth/contact/newsletter | Security |
| **P1** | Duplicate skin quiz handler in routes vs controller | Dead code |
| **P1** | No service layer (PLAN.md violation) | Architecture |
| **P1** | No admin API for products/orders/users | Missing feature |
| **P1** | Coupon validation doesn't apply to orders | Business logic gap |
| **P2** | Rating calculation duplicated 5 times | Maintainability |
| **P2** | No pagination on orders/reviews | Performance |
| **P2** | No caching anywhere | Performance |
| **P2** | `orderNumber` collision risk | Reliability |
| **P2** | Missing forgot/reset password flow | UX gap |
| **P3** | No `next/image` anywhere | Performance/SEO |
| **P3** | Zero React Query usage | Architecture |
| **P3** | No SSR/SSG (all pages are client) | SEO |
| **P3** | ProductCard duplicated 3 times | Code quality |

---

*Last updated: July 27, 2026*
*Project: Blooming Beauty Skin*
*Status: Audit Complete*
