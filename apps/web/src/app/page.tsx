'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  ArrowRight, Droplet, Droplets, Flower2,
  Gift, Heart, Package, ShieldCheck,
  Sun, Truck, Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroBannerSlider from '@/components/home/HeroBannerSlider';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  slug: string;
  shortDesc: string | null;
  price: string;
  comparePrice: string | null;
  brand: { name: string; slug: string };
  images: { url: string; alt: string | null }[];
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  _count: { products: number };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

interface PromoBanner {
  badgeText: string;
  title: string;
  subtitle: string;
  code: string;
  ctaLabel: string;
  ctaLink: string;
}

interface TrustBadge {
  icon: string;
  bg: string;
  ic: string;
  title: string;
  text: string;
}

interface SocialLink {
  label: string;
  href: string;
}

// ── Fallback data (shown only if the API is unreachable) ─────────────────────

const CATEGORIES: Category[] = [
  { id: 'c1', name: 'Cleanser',    slug: 'cleanser',    image: null },
  { id: 'c2', name: 'Toner',       slug: 'toner',       image: null },
  { id: 'c3', name: 'Serum',       slug: 'serum',       image: null },
  { id: 'c4', name: 'Moisturizer', slug: 'moisturizer', image: null },
  { id: 'c5', name: 'Sunscreen',   slug: 'sunscreen',   image: null },
  { id: 'c6', name: 'Mask',        slug: 'mask',        image: null },
];

const FALLBACK: Product[] = [
  { id: 'f1', name: 'Snail Mucin 96% Power Essence',        slug: 'cosrx-snail-mucin-96-essence',      shortDesc: 'Hydrating essence for soft, bouncy skin.',              price: '21.99', comparePrice: null, brand: { name: 'COSRX',            slug: 'cosrx'             }, images: [] },
  { id: 'f2', name: 'Glow Serum : Niacinamide + Propolis',  slug: 'beauty-of-joseon-glow-serum',       shortDesc: 'Gentle glow serum for dullness and uneven tone.',       price: '17.99', comparePrice: null, brand: { name: 'Beauty of Joseon', slug: 'beauty-of-joseon'  }, images: [] },
  { id: 'f3', name: 'Gokujyun Premium Hyaluronic Lotion',   slug: 'hada-labo-gokujyun-premium-lotion', shortDesc: 'Layer-friendly hydration for dry, dehydrated skin.',    price: '15.99', comparePrice: null, brand: { name: 'Hada Labo',        slug: 'hada-labo'         }, images: [] },
  { id: 'f4', name: 'Daily Soft Sunscreen',                 slug: 'daily-soft-sunscreen',              shortDesc: 'Lightweight protection for everyday Cambodian weather.', price: '18.99', comparePrice: null, brand: { name: 'Blooming Picks',   slug: 'blooming-picks'    }, images: [] },
];

const FALLBACK_PROMO: PromoBanner = {
  badgeText: 'Limited Offer',
  title: 'Get 10% Off Your First Order',
  subtitle: 'Use code BLOOM10 at checkout. Valid on all products. No minimum order required.',
  code: 'BLOOM10',
  ctaLabel: 'Shop Now',
  ctaLink: '/shop',
};

const FALLBACK_BADGES: TrustBadge[] = [
  { icon: 'ShieldCheck', bg: 'bg-sky-100',   ic: 'text-sky-300',     title: 'Authentic Products',  text: 'Sourced from trusted brands and distributors. Every product is 100% genuine.'        },
  { icon: 'Heart',       bg: 'bg-blush-100', ic: 'text-primary-400', title: 'Seller-Curated',      text: 'Handpicked with care for routines real people can use and love every day.'            },
  { icon: 'Truck',       bg: 'bg-peach-100', ic: 'text-peach-300',   title: 'Cambodia Delivery',   text: 'Free shipping on orders over $30. Same-day delivery available in Phnom Penh.'        },
];

const FALLBACK_SOCIAL: SocialLink[] = [
  { label: 'Facebook',  href: 'https://www.facebook.com/p/Blooming-Beauty-Skin-100067171744804/' },
  { label: 'Instagram', href: 'https://www.instagram.com/skinbloomingbeauty/'                   },
  { label: 'TikTok',    href: 'https://www.tiktok.com/@skinbloomingbeauty2'                     },
  { label: 'Telegram',  href: 'https://t.me/+vFrCO2pmNHthN2Fl'                                 },
];

// ── Category icon mapping (by slug) ───────────────────────────────────────────

function categoryIcon(slug: string): LucideIcon {
  switch (slug) {
    case 'cleanser':    return Droplets;
    case 'toner':       return Droplet;
    case 'serum':       return Flower2;
    case 'moisturizer': return Droplets;
    case 'sunscreen':   return Sun;
    case 'mask':        return Gift;
    default:            return Package;
  }
}

const CATEGORY_COLORS: Record<string, { bg: string; ic: string }> = {
  cleanser:    { bg: 'bg-sky-100',     ic: 'text-sky-300'    },
  toner:       { bg: 'bg-blush-100',   ic: 'text-primary-400' },
  serum:       { bg: 'bg-peach-100',   ic: 'text-peach-300'  },
  moisturizer: { bg: 'bg-primary-100', ic: 'text-primary-500' },
  sunscreen:   { bg: 'bg-cream-100',   ic: 'text-amber-400'  },
  mask:        { bg: 'bg-blush-200',   ic: 'text-primary-600' },
};

function badgeIcon(name: string): LucideIcon {
  switch (name) {
    case 'ShieldCheck': return ShieldCheck;
    case 'Heart':       return Heart;
    case 'Truck':       return Truck;
    default:            return Heart;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.slug}`} className="card group block">
      <div className="aspect-square bg-blush-50 flex items-center justify-center overflow-hidden rounded-t-3xl">
        {product.images.length > 0 ? (
          <img
            src={product.images[0].url}
            alt={product.images[0].alt || product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Package className="h-10 w-10 text-primary-200 opacity-60" />
        )}
      </div>
      <div className="p-4">
        <span className="badge-pink text-xs">{product.brand.name}</span>
        <h3 className="mt-2 line-clamp-2 text-sm font-bold text-gray-800 group-hover:text-primary-600 transition-colors">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-gray-400 leading-relaxed">
          {product.shortDesc ?? 'A gentle pick for your skincare routine.'}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-primary-600">{formatPrice(product.price)}</span>
            {product.comparePrice && (
              <span className="text-xs text-gray-400 line-through">{formatPrice(product.comparePrice)}</span>
            )}
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white shadow-pink-sm group-hover:bg-primary-600 transition-colors">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({
  badge, title, subtitle, href, hrefLabel = 'View all',
}: {
  badge: string; title: string; subtitle: string; href: string; hrefLabel?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="badge-pink">{badge}</span>
        <h2 className="mt-2 text-2xl font-heading font-extrabold text-gray-800 sm:text-3xl">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 shrink-0 text-sm font-bold text-primary-500 hover:text-primary-600 hover:underline underline-offset-2 transition-colors"
      >
        {hrefLabel} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [featured,    setFeatured]    = useState<Product[]>(FALLBACK);
  const [bestsellers, setBestsellers] = useState<Product[]>(FALLBACK);
  const [newArrivals, setNewArrivals] = useState<Product[]>(FALLBACK);
  const [recommended, setRecommended] = useState<Product[]>(FALLBACK);
  const [brands,      setBrands]      = useState<Brand[]>([]);
  const [categories,  setCategories]  = useState<Category[]>(CATEGORIES);
  const [promo,       setPromo]       = useState<PromoBanner>(FALLBACK_PROMO);
  const [badges,      setBadges]      = useState<TrustBadge[]>(FALLBACK_BADGES);
  const [social,      setSocial]      = useState<SocialLink[]>(FALLBACK_SOCIAL);

  useEffect(() => {
    async function load() {
      try {
        const [featRes, bestRes, newRes, recRes, brandRes, catRes, homeRes] = await Promise.all([
          api.get('/products/featured'),
          api.get('/products/bestsellers'),
          api.get('/products/new'),
          api.get('/products/recommended'),
          api.get('/brands'),
          api.get('/categories'),
          api.get('/home/settings'),
        ]);
        const feat = featRes.data.data.products ?? [];
        const best = bestRes.data.data.products ?? [];
        const newP = newRes.data.data.products  ?? [];
        const rec  = recRes.data.data.products  ?? [];
        const br   = brandRes.data.data.brands  ?? [];
        const cats = catRes.data.data.categories ?? [];
        const s    = homeRes.data.data.settings  ?? {};

        if (feat.length > 0) setFeatured(feat);
        if (best.length > 0) setBestsellers(best);
        if (newP.length > 0) setNewArrivals(newP);
        if (rec.length > 0)  setRecommended(rec);
        if (br.length > 0)   setBrands(br);
        if (cats.length > 0) setCategories(cats);

        if (s.promoBanner)   setPromo(s.promoBanner);
        if (s.trustBadges?.items?.length > 0)  setBadges(s.trustBadges.items);
        if (s.social?.links?.length > 0)       setSocial(s.social.links);
      } catch {
        // keep fallbacks
      }
    }
    load();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      <main className="flex-1">

        {/* ══════════════════════════════════════════════════════════
            SECTION 1 — Hero Banner Slider (fully dynamic, admin-managed)
        ══════════════════════════════════════════════════════════ */}
        <HeroBannerSlider />

        {/* ══════════════════════════════════════════════════════════
            SECTION 2 — Best-seller Products
        ══════════════════════════════════════════════════════════ */}
        <section className="py-10 lg:py-14 bg-blush-50">
          <div className="container-shop">
            <SectionHeader
              badge="Customer favourites"
              title="Best-seller picks"
              subtitle="Soft, reliable products we would happily recommend across many routines."
              href="/shop?sort=bestselling"
            />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {bestsellers.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 3 — New Arrivals
        ══════════════════════════════════════════════════════════ */}
        <section className="py-10 lg:py-14 bg-white">
          <div className="container-shop">
            <SectionHeader
              badge="Just landed"
              title="New arrivals"
              subtitle="Fresh additions for cleanser, hydration, glow, and barrier care."
              href="/shop?sort=newest"
            />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {newArrivals.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 4 — Recommended for You
        ══════════════════════════════════════════════════════════ */}
        <section className="py-10 lg:py-14 bg-blush-50">
          <div className="container-shop">
            <SectionHeader
              badge="Picked for you"
              title="Recommended products"
              subtitle="Handpicked routines based on what our customers love most."
              href="/shop"
            />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {recommended.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 5 — Featured / Staff Picks
        ══════════════════════════════════════════════════════════ */}
        <section className="py-10 lg:py-14 bg-white">
          <div className="container-shop">
            <SectionHeader
              badge="Editor's choice"
              title="Staff picks"
              subtitle="Products our team personally uses and loves."
              href="/shop"
            />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {featured.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 6 — Category Quick Links
        ══════════════════════════════════════════════════════════ */}
        <section className="py-10 lg:py-14 bg-blush-50">
          <div className="container-shop">
            <div className="mb-6 text-center">
              <span className="badge-pink">Shop by routine step</span>
              <h2 className="mt-3 text-2xl font-heading font-extrabold text-gray-800 sm:text-3xl">
                Choose what your skin needs today
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
                Start with one step or build a full soft routine — every category curated for gentle daily care.
              </p>
            </div>
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-6 md:overflow-visible md:pb-0 scrollbar-hide pr-6 md:pr-0">
                {categories.map((cat) => {
                  const Icon = categoryIcon(cat.slug);
                  const colors = CATEGORY_COLORS[cat.slug] ?? { bg: 'bg-blush-100', ic: 'text-primary-400' };
                  return (
                    <Link
                      key={cat.id}
                      href={`/shop?category=${cat.slug}`}
                      className="group flex flex-col items-center gap-2.5 rounded-3xl border border-blush-100
                                 bg-white p-4 text-center shadow-pink-sm shrink-0 w-28 md:w-auto
                                 transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-pink-md"
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colors.bg}`}>
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="h-full w-full rounded-2xl object-cover"
                          />
                        ) : (
                          <Icon className={`h-6 w-6 ${colors.ic}`} />
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-700 group-hover:text-primary-600 transition-colors">
                        {cat.name}
                      </p>
                    </Link>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-blush-50 to-transparent md:hidden" />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 7 — Shop by Brand
        ══════════════════════════════════════════════════════════ */}
        {brands.length > 0 && (
          <section className="py-10 lg:py-14 bg-white">
            <div className="container-shop">
              <SectionHeader
                badge="Trusted names"
                title="Shop by brand"
                subtitle="Authentic products from the brands you know and love."
                href="/brands"
              />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-6">
                {brands.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/brands/${brand.slug}`}
                    className="group flex flex-col items-center gap-3 rounded-3xl border border-blush-100
                               bg-white p-5 text-center shadow-pink-sm
                               transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-pink-md"
                  >
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-blush-50 border border-blush-100">
                      {brand.logo ? (
                        <Image src={brand.logo} alt={brand.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-extrabold text-primary-400">
                          {brand.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 group-hover:text-primary-600 transition-colors">
                        {brand.name}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {brand._count.products} product{brand._count.products !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            SECTION 8 — Promo Strip
        ══════════════════════════════════════════════════════════ */}
        <section className="py-10 lg:py-14 bg-white">
          <div className="container-shop">
            <div className="relative overflow-hidden rounded-4xl bg-gradient-to-r from-primary-500 via-primary-500 to-primary-600 px-8 py-10 lg:px-14 lg:py-12">
              {/* Decorative blobs */}
              <div className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-8 left-1/3 h-36 w-36 rounded-full bg-white/10" />

              <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white mb-3">
                    <Flame className="h-3 w-3" /> {promo.badgeText}
                  </span>
                  <h2 className="text-2xl font-heading font-extrabold text-white sm:text-3xl lg:text-4xl">
                    {promo.title}
                  </h2>
                  <p className="mt-2 text-primary-100 text-sm leading-relaxed max-w-md">
                    {promo.subtitle}{' '}
                    <strong className="text-white font-extrabold">{promo.code}</strong>
                  </p>
                </div>
                <Link
                  href={promo.ctaLink}
                  className="shrink-0 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold text-primary-600
                             shadow-pink-md hover:bg-primary-50 transition-all hover:-translate-y-0.5"
                >
                  {promo.ctaLabel} →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 9 — Skin Quiz CTA (DISABLED — re-enable when ready)
        ══════════════════════════════════════════════════════════ */}
        {/* <section className="py-10 lg:py-14 bg-blush-50">
          <div className="container-shop">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="badge-pink"><Sparkles className="h-3 w-3" /> Free skin quiz</span>
                <h2 className="mt-3 text-2xl font-heading font-extrabold text-gray-900 sm:text-3xl">
                  Not sure what to buy?<br />
                  Let us guide your routine
                </h2>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-md">
                  Answer a few quick questions about your skin and we'll recommend
                  products that actually suit you — no guessing needed.
                </p>
                <Link href="/skin-quiz" className="mt-6 btn-primary inline-flex">
                  Take the free quiz →
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { step: '1', icon: MessageCircle, text: 'Tell us your skin type' },
                  { step: '2', icon: Target, text: 'Choose your concerns'   },
                  { step: '3', icon: ShoppingBag, text: 'Get your picks'         },
                ].map(({ step, icon: StepIcon, text }) => (
                  <div key={step} className="rounded-3xl bg-white border border-blush-100 p-5 shadow-pink-sm text-center">
                    <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-sm font-extrabold text-white">
                      {step}
                    </div>
                    <StepIcon className="mx-auto h-6 w-6 text-primary-400" />
                    <p className="mt-2 text-xs font-semibold text-gray-700 leading-snug">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section> */}

        {/* ══════════════════════════════════════════════════════════
            SECTION 10 — Trust Badges
        ══════════════════════════════════════════════════════════ */}
        <section className="py-10 lg:py-14 bg-white">
          <div className="container-shop">
            <div className="grid gap-4 md:grid-cols-3">
              {badges.map((item) => {
                const Icon = badgeIcon(item.icon);
                return (
                  <div key={item.title} className="rounded-3xl bg-white border border-blush-100 p-6 shadow-pink-sm hover:shadow-pink-md transition-shadow">
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg}`}>
                      <Icon className={`h-6 w-6 ${item.ic}`} />
                    </div>
                    <h3 className="mt-4 font-heading text-lg font-extrabold text-gray-800">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 11 — Follow Us / Social CTA
        ══════════════════════════════════════════════════════════ */}
        <section className="py-14 lg:py-20 bg-gradient-to-br from-blush-50 via-primary-50 to-cream-50">
          <div className="container-shop text-center">
            <div className="animate-bounce-soft inline-block mb-4">
              <Flower2 className="h-14 w-14 text-primary-400" />
            </div>
            <h2 className="text-2xl font-heading font-extrabold text-gray-900 sm:text-3xl">
              Ready to start glowing softly?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
              Browse the shop, take the quiz, or follow us for daily skincare inspo.
            </p>

            {/* CTA buttons */}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/shop" className="btn-primary px-8 py-3.5">
                Browse products
              </Link>
              <Link href="/about" className="btn-secondary px-8 py-3.5">
                Learn more
              </Link>
            </div>

            {/* Social links */}
            <div className="mt-10">
              <p className="text-xs font-bold uppercase tracking-widest text-primary-400 mb-4">
                Follow us
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {social.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="badge-pink text-sm px-4 py-2 hover:bg-primary-500 hover:text-white transition-all duration-150"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
