now let# 🌸 Blooming Beauty Skin — E-Commerce Platform Plan

## Overview

| Item | Detail |
|------|--------|
| **Stack** | Next.js 14 (App Router) + Node.js/Express API |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | NextAuth.js + JWT |
| **Payments** | ABA Pay, Wing, Visa/MC, COD |
| **PWA** | next-pwa |
| **Hosting** | Vercel (frontend) + Railway/Render (API) |
| **Storage** | Cloudinary or AWS S3 (product images) |
| **Language** | Khmer + English (i18n) |

---

## Phase 0: Foundation & Planning (Day 1-3)

### 0.1 Brand & Business
- [ ] Define product categories (Cleanser, Toner, Serum, Moisturizer, Sunscreen, Mask, etc.)
- [ ] Set up product taxonomy: Brand > Category > Skin Type > Concern
- [ ] Define shipping zones & rates (Phnom Penh vs provinces)
- [ ] Set up business license & ABA Pay / Wing merchant accounts
- [ ] Create social media pages (Facebook, Instagram, TikTok)

### 0.2 Project Scaffolding

```
blooming-beauty-skin/
├── apps/
│   ├── web/                      # Next.js frontend (PWA)
│   │   ├── app/
│   │   │   ├── (shop)/           # Shop layout group
│   │   │   │   ├── page.tsx                # Home
│   │   │   │   ├── shop/page.tsx           # Product listing
│   │   │   │   ├── product/[slug]/page.tsx # Product detail
│   │   │   │   ├── cart/page.tsx           # Cart
│   │   │   │   ├── checkout/page.tsx       # Checkout
│   │   │   │   └── confirmation/page.tsx   # Order confirmation
│   │   │   ├── (account)/        # Auth layout group
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── dashboard/page.tsx
│   │   │   ├── (info)/           # Static pages
│   │   │   │   ├── about/page.tsx
│   │   │   │   ├── contact/page.tsx
│   │   │   │   └── blog/page.tsx
│   │   │   ├── api/              # Next.js API routes (BFF)
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/               # Button, Input, Modal, etc.
│   │   │   ├── layout/           # Header, Footer, Sidebar
│   │   │   ├── product/          # ProductCard, ProductGrid, etc.
│   │   │   ├── cart/             # CartItem, CartSummary
│   │   │   ├── checkout/         # CheckoutForm, PaymentSelector
│   │   │   └── home/             # Hero, CategoryGrid, etc.
│   │   ├── hooks/                # useCart, useWishlist, useAuth
│   │   ├── lib/                  # api client, utils, constants
│   │   ├── stores/               # Zustand stores
│   │   └── styles/               # Global CSS, Tailwind config
│   └── api/                      # Express.js API server
│       ├── src/
│       │   ├── routes/           # Route definitions
│       │   ├── controllers/      # Request handlers
│       │   ├── services/         # Business logic
│       │   ├── middlewares/       # Auth, validation, error handler
│       │   ├── prisma/           # Schema & migrations
│       │   └── utils/            # Helpers, payment SDKs
│       └── package.json
├── packages/
│   └── shared/                   # Shared types, constants
├── docker-compose.yml
├── turbo.json
├── package.json
└── .env.example
```

---

## Phase 1: Database & API (Day 4-10)

### 1.1 Database Schema (Prisma)

```prisma
// ==========================================
// USER & AUTH
// ==========================================
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  phone         String?
  password      String
  role          Role      @default(CUSTOMER)
  avatar        String?
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  addresses     Address[]
  orders        Order[]
  reviews       Review[]
  cart          Cart?
  wishlist      Wishlist[]
  skinProfile   SkinProfile?
  blogPosts     BlogPost[]
}

enum Role {
  CUSTOMER
  ADMIN
}

model Address {
  id        String  @id @default(cuid())
  userId    String
  name      String
  phone     String
  street    String
  city      String
  province  String
  isDefault Boolean @default(false)

  user      User    @relation(fields: [userId], references: [id])
  orders    Order[]
}

// ==========================================
// PRODUCT & CATALOG
// ==========================================
model Product {
  id           String          @id @default(cuid())
  name         String
  slug         String          @unique
  description  String          @db.Text
  shortDesc    String?
  price        Decimal         @db.Decimal(10, 2)
  comparePrice Decimal?        @db.Decimal(10, 2)
  sku          String          @unique
  stock        Int             @default(0)
  weight       Float?
  isActive     Boolean         @default(true)
  isFeatured   Boolean         @default(false)
  categoryId   String
  brandId      String
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  category     Category        @relation(fields: [categoryId], references: [id])
  brand        Brand           @relation(fields: [brandId], references: [id])
  images       ProductImage[]
  variants     ProductVariant[]
  reviews      Review[]
  cartItems    CartItem[]
  orderItems   OrderItem[]
  wishlist     Wishlist[]
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  url       String
  alt       String?
  sortOrder Int     @default(0)

  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProductVariant {
  id        String   @id @default(cuid())
  productId String
  name      String
  price     Decimal  @db.Decimal(10, 2)
  stock     Int      @default(0)
  options   Json?

  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  cartItems CartItem[]
  orderItems OrderItem[]
}

model Category {
  id        String     @id @default(cuid())
  name      String
  slug      String     @unique
  description String?
  image     String?
  parentId  String?

  parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
  products  Product[]
}

model Brand {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  logo        String?
  description String?

  products    Product[]
}

// ==========================================
// CART & ORDERS
// ==========================================
model Cart {
  id        String     @id @default(cuid())
  userId    String?    @unique
  sessionId String?    @unique
  expiresAt DateTime?

  user      User?      @relation(fields: [userId], references: [id])
  items     CartItem[]
}

model CartItem {
  id        String           @id @default(cuid())
  cartId    String
  productId String
  variantId String?
  quantity  Int              @default(1)

  cart      Cart             @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product   Product          @relation(fields: [productId], references: [id])
  variant   ProductVariant?  @relation(fields: [variantId], references: [id])
}

model Order {
  id               String      @id @default(cuid())
  userId           String
  orderNumber      String      @unique
  status           OrderStatus @default(PENDING)
  subtotal         Decimal     @db.Decimal(10, 2)
  shippingCost     Decimal     @db.Decimal(10, 2) @default(0)
  discount         Decimal     @db.Decimal(10, 2) @default(0)
  total            Decimal     @db.Decimal(10, 2)
  shippingName     String
  shippingPhone    String
  shippingAddress  String
  shippingCity     String
  shippingProvince String
  notes            String?
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  user             User        @relation(fields: [userId], references: [id])
  address          Address?    @relation(fields: [shippingAddressId], references: [id])
  shippingAddressId String?
  items            OrderItem[]
  payment          Payment?
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPING
  DELIVERED
  CANCELLED
  REFUNDED
}

model OrderItem {
  id        String           @id @default(cuid())
  orderId   String
  productId String
  variantId String?
  quantity  Int
  price     Decimal          @db.Decimal(10, 2)

  order     Order            @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product          @relation(fields: [productId], references: [id])
  variant   ProductVariant?  @relation(fields: [variantId], references: [id])
}

model Wishlist {
  id        String  @id @default(cuid())
  userId    String
  productId String

  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
}

// ==========================================
// PAYMENTS
// ==========================================
model Payment {
  id            String        @id @default(cuid())
  orderId       String        @unique
  method        PaymentMethod
  amount        Decimal       @db.Decimal(10, 2)
  status        PaymentStatus @default(PENDING)
  transactionId String?
  paidAt        DateTime?
  createdAt     DateTime      @default(now())

  order         Order         @relation(fields: [orderId], references: [id])
}

enum PaymentMethod {
  ABA_PAY
  WING
  CREDIT_CARD
  CASH_ON_DELIVERY
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

// ==========================================
// REVIEWS & CONTENT
// ==========================================
model Review {
  id        String   @id @default(cuid())
  userId    String
  productId String
  rating    Int
  comment   String?  @db.Text
  images    String[]
  isApproved Boolean @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
  product   Product  @relation(fields: [productId], references: [id])

  @@unique([userId, productId])
}

model BlogPost {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  content     String   @db.Text
  excerpt     String?
  coverImage  String?
  authorId    String
  publishedAt DateTime?
  tags        String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  author      User     @relation(fields: [authorId], references: [id])
}

model Coupon {
  id         String   @id @default(cuid())
  code       String   @unique
  type       CouponType
  value      Decimal  @db.Decimal(10, 2)
  minOrder   Decimal? @db.Decimal(10, 2)
  maxUses    Int?
  usedCount  Int      @default(0)
  expiresAt  DateTime?
  isActive   Boolean  @default(true)
}

enum CouponType {
  PERCENTAGE
  FIXED_AMOUNT
}

// ==========================================
// SKINCARE-SPECIFIC
// ==========================================
model SkinProfile {
  id        String   @id @default(cuid())
  userId    String   @unique
  skinType  SkinType
  concerns  String[]
  routine   Json?
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id])
}

enum SkinType {
  NORMAL
  DRY
  OILY
  COMBINATION
  SENSITIVE
}
```

### 1.2 API Endpoints

```
==========================================
AUTH
==========================================
POST   /api/auth/register          Create new account
POST   /api/auth/login             Login & get token
POST   /api/auth/logout            Invalidate token
GET    /api/auth/me                Get current user
PUT    /api/auth/profile           Update profile
POST   /api/auth/forgot-password   Request password reset
POST   /api/auth/reset-password    Reset password with token

==========================================
PRODUCTS
==========================================
GET    /api/products               List products (paginated, filterable)
GET    /api/products/:slug         Get product by slug
GET    /api/products/featured      Get featured products
GET    /api/products/bestsellers   Get bestsellers
GET    /api/products/new           Get new arrivals
GET    /api/products/:id/reviews   Get product reviews
POST   /api/products/:id/reviews   Submit product review

Query params: ?category=&brand=&skinType=&concern=&minPrice=&maxPrice=&sort=&page=&limit=

==========================================
CATEGORIES & BRANDS
==========================================
GET    /api/categories             Get category tree
GET    /api/categories/:slug       Get category with products
GET    /api/brands                 Get all brands
GET    /api/brands/:slug           Get brand with products

==========================================
CART
==========================================
GET    /api/cart                   Get current cart
POST   /api/cart/items             Add item to cart
PUT    /api/cart/items/:id         Update cart item quantity
DELETE /api/cart/items/:id         Remove cart item
DELETE /api/cart                   Clear entire cart

==========================================
ORDERS
==========================================
POST   /api/orders                 Create order from cart
GET    /api/orders                 Get user orders (paginated)
GET    /api/orders/:orderNumber    Get order detail

==========================================
PAYMENTS
==========================================
POST   /api/payments/aba-pay       Initiate ABA Pay payment
POST   /api/payments/wing          Initiate Wing payment
POST   /api/payments/webhook       Handle payment callbacks (ABA/Wing)
GET    /api/payments/:orderId      Get payment status

==========================================
WISHLIST
==========================================
GET    /api/wishlist               Get user wishlist
POST   /api/wishlist/:productId    Add product to wishlist
DELETE /api/wishlist/:productId    Remove from wishlist

==========================================
REVIEWS
==========================================
GET    /api/reviews/product/:id    Get product reviews
POST   /api/reviews                Submit review
PUT    /api/reviews/:id            Update review
DELETE /api/reviews/:id            Delete review

==========================================
BLOG
==========================================
GET    /api/blog                   List blog posts (paginated)
GET    /api/blog/:slug             Get blog post

==========================================
SKINCARE
==========================================
POST   /api/skin-quiz              Submit quiz & get recommendations
GET    /api/recommendations        Get personalized recommendations

==========================================
COUPONS
==========================================
POST   /api/coupons/validate       Validate coupon code

==========================================
ADMIN
==========================================
GET    /api/admin/dashboard        Sales overview
GET    /api/admin/products         Product management
POST   /api/admin/products         Create product
PUT    /api/admin/products/:id     Update product
DELETE /api/admin/products/:id     Delete product
GET    /api/admin/orders           Order management
PUT    /api/admin/orders/:id       Update order status
GET    /api/admin/users            User management
POST   /api/admin/blog             Create blog post
PUT    /api/admin/blog/:id         Update blog post
POST   /api/admin/coupons          Create coupon
```

---

## Phase 2: Frontend Pages (Day 11-25)

### Page-by-Page Breakdown

---

### 🏠 Page 1: Home (`/`)

**Sections:**

| # | Section | Description |
|---|---------|-------------|
| 1 | Hero Banner | Full-width carousel (3-4 slides). Current promotions, new arrivals. CTA buttons -> Shop Now / Learn More |
| 2 | Category Showcase | Grid of category cards with images. Skincare, Sun care, Body care, Sets & Kits |
| 3 | Bestsellers | Horizontal scroll product cards (8-10 items) |
| 4 | Find Your Routine | Skin type quiz CTA banner with illustration |
| 5 | New Arrivals | Product grid (4 items) |
| 6 | Skincare Tips | Blog preview cards (3 latest articles) |
| 7 | Social Proof | Customer reviews/testimonials carousel |
| 8 | Instagram Feed | Shoppable Instagram grid (6 posts) |
| 9 | Newsletter Signup | Email capture with 10% off offer |
| 10 | Footer | Links, contact info, social media, payment icons |

**Components:**

```
HeroCarousel
CategoryGrid
ProductCard
ProductCarousel
SkinQuizBanner
BlogPreview
TestimonialSlider
InstagramFeed
NewsletterForm
Footer
```

---

### 🛍️ Page 2: Shop (`/shop`)

**Layout:**

| Area | Content |
|------|---------|
| Left Sidebar (desktop) | Filter panel |
| Top filter bar (mobile) | Horizontal scrollable filter chips |
| Main Area | Product grid (3 columns desktop, 2 mobile) |
| Bottom | Pagination or infinite scroll |

**Filters:**

| Filter | Type |
|--------|------|
| Category | Checkboxes (Cleanser, Toner, Serum, etc.) |
| Brand | Checkboxes (dynamic from DB) |
| Skin Type | Radio buttons (Normal, Dry, Oily, Combination, Sensitive) |
| Concern | Checkboxes (Acne, Aging, Hyperpigmentation, Hydration, Pores) |
| Price Range | Dual slider ($0 - $100) |
| Sort By | Dropdown (Popular, Price Low-High, Price High-Low, Newest, Rating) |

**Features:**

- URL-based filters for SEO: `/shop?category=serum&skinType=oily`
- Product count display: "Showing 24 of 156 products"
- Active filter chips with individual clear buttons
- Mobile: Slide-in filter panel from left
- Quick view modal on product hover/tap
- Grid/List view toggle

---

### 📦 Page 3: Product Detail (`/product/[slug]`)

**Sections:**

| # | Section | Details |
|---|---------|---------|
| 1 | Image Gallery | Main image + thumbnails. Zoom on hover (desktop). Swipe on mobile. Pinch-to-zoom. |
| 2 | Product Info | Brand name (linked), Product name, Price (with compare price strikethrough), Star rating + review count, Short description |
| 3 | Variant Selector | Size/variant buttons with stock indicator |
| 4 | Quantity Controls | - / number / + with stock limit |
| 5 | Add to Cart | Primary CTA button, full width on mobile |
| 6 | Wishlist | Heart icon button (toggle) |
| 7 | Stock Status | "In Stock" green / "Low Stock - Only X left" orange / "Out of Stock" red |
| 8 | Skin Type Match | Icons showing which skin types this product suits |
| 9 | Key Ingredients | Expandable accordion with ingredient benefits and icons |
| 10 | How to Use | Step-by-step instructions with icons |
| 11 | Tabs | Description | Ingredients | Reviews (full list) |
| 12 | Reviews Section | Overall rating breakdown (5-star bar chart), Individual reviews with photos, Sort by: Most Recent / Most Helpful, Write a review form (logged-in users only) |
| 13 | Related Products | "You May Also Like" carousel (6-8 items) |
| 14 | Complete Your Routine | Bundle suggestion based on this product category |

---

### 🛒 Page 4: Cart (`/cart`)

**Layout:** Two columns (table left, summary right). Single column on mobile.

**Cart Items Table:**

| Column | Content |
|--------|---------|
| Product | Image + name + variant info |
| Price | Unit price |
| Quantity | +/- controls with number input |
| Total | Line total (price x quantity) |
| Actions | Remove (X) button |

**Cart Summary (Sidebar):**

| Line | Content |
|------|---------|
| Subtotal | Sum of all items |
| Shipping | Estimated (calculated on checkout) |
| Coupon | Input field + Apply button |
| Discount | Amount saved (shown if coupon applied) |
| **Total** | **Bold, large font** |
| CTA | **Proceed to Checkout** button |

**Additional Features:**

- Free shipping progress bar: "Add $X more for free shipping!" with visual indicator
- Recently viewed products below cart
- Empty cart state: Illustration + "Your cart is empty" + "Continue Shopping" CTA
- Quantity update -> auto-recalculate via API
- Remove item -> undo toast notification (5 second window)
- Persist cart across devices for logged-in users

---

### 💳 Page 5: Checkout (`/checkout`)

**Multi-step form with progress indicator:**

```
[Shipping Info] -----> [Delivery Method] -----> [Payment] -----> [Review]
```

**Step 1: Shipping Information**

| Field | Type | Required |
|-------|------|----------|
| Full Name | Text input | Yes |
| Phone | Phone input with country code | Yes |
| Email | Email input | Yes |
| Address Line 1 | Text input | Yes |
| Address Line 2 | Text input | No |
| Province | Dropdown (25 Cambodian provinces) | Yes |
| City/District | Text input or dynamic dropdown | Yes |
| Postal Code | Text input | No |
| Save this address | Checkbox | No |
| Delivery Notes | Textarea | No |

**Step 2: Delivery Method**

| Option | Description | Price |
|--------|-------------|-------|
| Standard Delivery | 3-5 business days | Calculated by weight/zone |
| Express Delivery | 1-2 business days | Higher rate |
| Store Pickup | Pick up at physical store | Free |

**Step 3: Payment Method**

| Method | Description |
|--------|-------------|
| ABA Pay | Redirect to ABA banking app/web |
| Wing | Redirect to Wing Money |
| Credit/Debit Card | Visa/Mastercard form |
| Cash on Delivery | Pay when you receive |

**Step 4: Order Review**

| Section | Content |
|---------|---------|
| Items Summary | Product list with images, names, quantities, prices |
| Shipping Address | Display selected address |
| Delivery Method | Display selected method |
| Payment Method | Display selected method with icon |
| Price Breakdown | Subtotal, Shipping, Discount, **Total** |
| Terms | "I agree to Terms & Conditions" checkbox |
| CTA | **Place Order** button |

**Order Confirmation Page (`/confirmation`):**

- Checkmark animation
- "Thank you for your order!"
- Order number (copyable)
- Order summary
- Estimated delivery date
- "Continue Shopping" CTA
- Social share buttons
- WhatsApp share for order receipt

---

### 👤 Page 6: User Dashboard (`/dashboard`)

**Sidebar Navigation:**

| Menu Item | Icon | Description |
|-----------|------|-------------|
| Profile | User | Edit name, email, phone, avatar |
| My Orders | Package | Order list with status badges |
| Wishlist | Heart | Saved products grid |
| Addresses | MapPin | Manage shipping addresses |
| Skin Profile | Sparkles | Skin type, concerns, routine |
| Reviews | Star | My submitted reviews |
| Change Password | Lock | Password change form |

**Order List View:**

| Column | Content |
|--------|---------|
| Order # | Clickable link to detail |
| Date | Order date |
| Items | Thumbnail stack + count |
| Total | Order total |
| Status | Color-coded badge (Pending, Processing, Shipping, Delivered) |
| Action | "View Details" button |

**Order Detail View:**

- Order timeline/tracking
- Items list
- Shipping address
- Payment info
- Invoice download

---

### 📝 Page 7: Blog (`/blog`)

**Blog Listing (`/blog`):**

| Element | Description |
|---------|-------------|
| Featured Post | Large hero card at top |
| Post Grid | Cards with cover image, title, excerpt, date, author, category badge |
| Categories | Sidebar/top bar: Skincare Tips, Ingredient Guide, Routine Building, Product Reviews, Beauty News |
| Search | Blog-specific search bar |
| Tags | Clickable tag pills |
| Pagination | Page numbers or load more |

**Blog Post (`/blog/[slug]`):**

| Element | Description |
|---------|-------------|
| Cover Image | Full-width hero image |
| Title | Large heading |
| Meta | Author name + avatar, published date, reading time estimate |
| Content | Rich text with embedded images, headings, lists |
| Tags | Clickable tags at bottom |
| Share | Facebook, Telegram, WhatsApp share buttons |
| Related Posts | 3 related articles grid |
| Comments | Comment section with reply support |

---

### 📄 Page 8: Static Pages

**About Us (`/about`)**

| Section | Content |
|---------|---------|
| Hero | Brand tagline with lifestyle image |
| Our Story | Brand origin story, founder story |
| Mission | Why "Blooming Beauty Skin" - making skincare accessible in Cambodia |
| Values | Clean beauty, cruelty-free, authentic products, customer-first |
| Team | Founder photos and bios |
| CTA | "Shop Now" or "Take Our Skin Quiz" |

**Contact (`/contact`)**

| Element | Content |
|---------|---------|
| Contact Form | Name, email, subject, message |
| Phone | +855 XX XXX XXX (clickable) |
| Email | hello@bloomingbeautyskin.com |
| WhatsApp | Direct WhatsApp link |
| Address | Physical store location |
| Map | Embedded Google Map |
| Business Hours | Mon-Sat: 9AM-6PM, Sun: Closed |
| Social Links | Facebook, Instagram, TikTok icons |

**Skin Quiz (`/skin-quiz`)**

| Step | Question | Options |
|------|----------|---------|
| 1 | How does your skin feel in the morning? | Oily, Dry, Tight, Normal, Combination |
| 2 | How often do you get breakouts? | Never, Sometimes, Often, Always |
| 3 | What's your main skin concern? | Acne, Aging, Dark spots, Dryness, Redness, Large pores |
| 4 | How does your skin react to the sun? | Burns easily, Tans gradually, Rarely burns |
| 5 | What's your current routine? | None, Basic (1-2 steps), Moderate (3-4 steps), Full (5+ steps) |
| 6 | What climate do you live in? | Hot & humid, Hot & dry, Tropical (Cambodia default) |

**Results Page:**

- Skin type determination
- Top 3 concerns identified
- Recommended routine (AM & PM steps)
- Product recommendations per step (linked to shop)
- Save results to profile (if logged in)
- Share results on social media
- "Shop Your Routine" CTA

---

## Phase 3: Payment Integration (Day 26-30)

### 3.1 ABA Pay Integration

```
Flow:
1. User selects ABA Pay at checkout
2. Backend creates payment request with ABA API
3. User redirected to ABA payment page
4. User completes payment in ABA app
5. ABA sends webhook to our backend
6. Backend updates order status to CONFIRMED
7. User redirected back to confirmation page

Files:
- src/services/payment/aba-pay.ts
- src/routes/payments.ts
- src/controllers/payment.controller.ts
```

### 3.2 Wing Integration

```
Flow:
1. User selects Wing at checkout
2. Backend creates Wing Money request
3. User redirected to Wing payment
4. User completes payment
5. Wing sends callback
6. Backend updates order status
7. User redirected to confirmation

Files:
- src/services/payment/wing.ts
```

### 3.3 Cash on Delivery

```
Flow:
1. User selects COD at checkout
2. Order created with status PENDING
3. Delivery person collects payment
4. Admin marks order as PAID
5. Order status updates to DELIVERED

No external API needed - simple flag on order
```

### 3.4 Environment Variables

```env
# ABA Pay
ABA_MERCHANT_ID=your_merchant_id
ABA_SECRET_KEY=your_secret_key
ABA_API_URL=https://pay.abc.com.kh/merchant/api/v1
ABA_WEBHOOK_URL=https://your-domain.com/api/payments/webhook

# Wing
WING_MERCHANT_ID=your_merchant_id
WING_API_KEY=your_api_key
WING_API_URL=https://wing.com/api/v1

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/blooming_beauty

# Auth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Phase 4: PWA & Performance (Day 31-35)

### 4.1 PWA Configuration

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|webp|svg)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/your-api\.com\/api\/products/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'products',
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
      },
    },
  ],
});

module.exports = withPWA({ /* next config */ });
```

### 4.2 PWA Manifest

```json
{
  "name": "Blooming Beauty Skin",
  "short_name": "BBS",
  "description": "Your trusted skincare shop in Cambodia",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#E91E63",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 4.3 Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| Lighthouse Score | 90+ | Optimize all metrics |
| First Contentful Paint | < 1.5s | SSR, font optimization |
| Largest Contentful Paint | < 2.5s | Image optimization, CDN |
| Cumulative Layout Shift | < 0.1 | Reserved image dimensions |
| Time to Interactive | < 3.5s | Code splitting, lazy loading |

### 4.4 Optimization Checklist

- [ ] Next.js `<Image>` component for all product images
- [ ] Cloudinary for image CDN + auto-format (WebP/AVIF)
- [ ] `next/font` for Khmer fonts (Battambang, Siemreap)
- [ ] Dynamic imports for heavy components (modals, editors)
- [ ] API response caching with revalidation
- [ ] Static generation for product pages where possible
- [ ] Code splitting by route
- [ ] Compression (Brotli/Gzip) on hosting

---

## Phase 5: Content & SEO (Day 36-40)

### 5.1 SEO Strategy

| Page | Title Format | Description |
|------|-------------|-------------|
| Home | Blooming Beauty Skin - Skincare Shop Cambodia | Discover authentic skincare products... |
| Shop | Shop Skincare Products | Browse cleansers, serums, moisturizers... |
| Product | `{Product Name} - Blooming Beauty Skin` | `{Short description}` |
| Blog | `{Post Title} - BBS Blog` | `{Excerpt}` |
| Category | `{Category} Products - Blooming Beauty` | `Shop {category} for {skin types}` |

### 5.2 Technical SEO

```tsx
// App Router metadata
export const metadata: Metadata = {
  title: `${product.name} - Blooming Beauty Skin`,
  description: product.shortDesc,
  openGraph: {
    title: product.name,
    description: product.shortDesc,
    images: [{ url: product.images[0].url, width: 1200, height: 630 }],
  },
};

// Structured Data (JSON-LD)
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description,
  image: product.images.map(i => i.url),
  offers: {
    '@type': 'Offer',
    price: product.price,
    priceCurrency: 'USD',
    availability: product.stock > 0 ? 'InStock' : 'OutOfStock',
  },
  brand: { '@type': 'Brand', name: product.brand.name },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: averageRating,
    reviewCount: reviewCount,
  },
};
```

### 5.3 Khmer Localization

| Feature | Implementation |
|---------|---------------|
| UI Text | `next-intl` with Khmer/English JSON files |
| Product Descriptions | Bilingual fields in DB |
| Date Formatting | Khmer date format support |
| Number Formatting | Khmer numerals optional |
| RTL | Not needed (Khmer is LTR) |

---

## Phase 6: Admin Panel (Day 41-50)

### Admin Dashboard Pages

| Page | Route | Features |
|------|-------|----------|
| Dashboard | `/admin` | Sales overview, revenue chart, recent orders, low stock alerts |
| Products | `/admin/products` | Table with search/filter, CRUD, bulk actions, image upload |
| Orders | `/admin/orders` | Order list with status filters, update status, print invoice |
| Customers | `/admin/customers` | User list, view order history |
| Blog | `/admin/blog` | Post editor with rich text, publish/schedule |
| Coupons | `/admin/coupons` | Create/edit coupons, usage stats |
| Settings | `/admin/settings` | Store settings, shipping rates, payment config |

### Tech Stack for Admin

- Built with Next.js + shadcn/ui components
- Server-side rendering for data tables
- React Query for data fetching
- Zod for form validation
- Recharts for dashboard charts

---

## Phase 7: Testing & QA (Day 51-55)

### Test Categories

| Type | Tool | Coverage |
|------|------|----------|
| Unit Tests | Jest | API services, utilities, business logic |
| Integration Tests | Jest + Supertest | API endpoint testing |
| E2E Tests | Playwright | Checkout flow, auth flow, search |
| Visual Regression | Percy or Chromatic | UI component snapshots |
| Performance | Lighthouse CI | Performance budgets |
| Security | OWASP ZAP | Vulnerability scanning |

### Critical Test Scenarios

- [ ] User registration & login
- [ ] Add to cart -> checkout -> payment -> confirmation
- [ ] Product search and filtering
- [ ] Coupon application
- [ ] Wishlist add/remove
- [ ] Blog post reading
- [ ] Skin quiz submission
- [ ] Mobile responsiveness
- [ ] Payment webhook handling
- [ ] Order status updates
- [ ] Image loading performance

---

## Phase 8: Launch (Day 56-60)

### Pre-Launch Checklist

**Infrastructure:**
- [ ] Domain configured: `bloomingbeautyskin.com.kh` or `.com`
- [ ] SSL certificate active (HTTPS)
- [ ] DNS records configured
- [ ] Vercel deployment (frontend)
- [ ] Railway/Render deployment (API)
- [ ] Production database provisioned
- [ ] Cloudinary production account

**Security:**
- [ ] Environment variables set in production
- [ ] API rate limiting enabled
- [ ] CORS configured for production domain
- [ ] CSRF protection active
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS prevention (React handles this)
- [ ] Admin route protection

**Monitoring:**
- [ ] Sentry error tracking configured
- [ ] Google Analytics installed
- [ ] Facebook Pixel installed
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Database backup strategy

**Content:**
- [ ] All product data migrated
- [ ] Product images uploaded
- [ ] Categories and brands populated
- [ ] Blog posts published
- [ ] About Us page written
- [ ] Contact info accurate
- [ ] Privacy Policy page
- [ ] Terms of Service page

**Legal:**
- [ ] Business license verified
- [ ] Payment merchant accounts activated
- [ ] Shipping partner agreements signed

**Testing:**
- [ ] Complete purchase flow tested in production
- [ ] Payment tested in production mode
- [ ] Mobile testing on real devices
- [ ] Cross-browser testing complete
- [ ] Load testing passed

### Launch Day Steps

```
1. Run final database migrations
2. Seed initial data (categories, sample products)
3. Deploy API to production
4. Deploy frontend to production
5. Test complete purchase flow
6. Verify payment processing
7. Check all pages render correctly
8. Test on mobile devices
9. Monitor error logs
10. Announce on social media
```

### Post-Launch (Week 1)

- [ ] Monitor for errors and bugs
- [ ] Collect user feedback
- [ ] Fix critical issues immediately
- [ ] Set up customer support workflow
- [ ] Plan Phase 2 features
- [ ] Start content marketing (blog posts)
- [ ] Launch social media campaigns

---

## Skincare-Specific Features (Bonus)

| Feature | Description | Priority |
|---------|-------------|----------|
| Skin Type Quiz | Interactive quiz with personalized recommendations | MVP |
| Ingredient Glossary | Searchable database of skincare ingredients | Phase 2 |
| Routine Builder | AM/PM routine step suggestions | Phase 2 |
| Skin Concern Filter | Filter by acne, aging, hydration, brightening | MVP |
| Product Sets | Curated bundles (e.g., "Dry Skin Starter Kit") | MVP |
| Expiry Date Tracking | Show product shelf life and PAO symbol | Phase 2 |
| Texture/Finish Info | Matte, dewy, lightweight, rich descriptors | MVP |
| Before/After Gallery | User-submitted transformation photos | Phase 2 |
| Skin Diary | Track skin progress over time | Phase 3 |
| Auto-Replenish | Subscribe for recurring delivery | Phase 3 |

---

## Estimated Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 0 | 3 days | Project setup, branding, scaffolding |
| Phase 1 | 7 days | Database schema + API endpoints |
| Phase 2 | 15 days | All frontend pages built |
| Phase 3 | 5 days | Payment integration working |
| Phase 4 | 5 days | PWA + performance optimized |
| Phase 5 | 5 days | Content + SEO complete |
| Phase 6 | 10 days | Admin panel functional |
| Phase 7 | 5 days | Testing and QA passed |
| Phase 8 | 5 days | Launch prep and go-live |
| **Total** | **~60 days** | **MVP Launch** |

---

## Quick Reference: Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Framework | Next.js 14 | SSR for SEO, App Router, React ecosystem |
| Database | PostgreSQL | Robust, relational, handles e-commerce well |
| ORM | Prisma | Type-safe, great DX, migrations |
| State Management | Zustand | Lightweight, perfect for cart/auth state |
| Styling | Tailwind CSS | Rapid development, consistent design |
| Component Library | shadcn/ui | Accessible, customizable, no bundle bloat |
| Form Handling | React Hook Form + Zod | Performant, validated forms |
| API Client | Axios + React Query | Caching, retries, optimistic updates |
| Payments | ABA Pay + Wing + COD | Covers 95% of Cambodian payment methods |
| Hosting | Vercel + Railway | Easy deployment, good DX, scales well |

---

*Last updated: July 14, 2026*
*Project: Blooming Beauty Skin*
*Status: Planning*
