'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ShoppingBag, Search, User, X, Heart, LogOut,
  ChevronDown, ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';

const navItems = [
  { name: 'Home', href: '/' },
  { name: 'Shop All', href: '/shop' },
  { name: 'Cleanser', href: '/shop?category=cleanser' },
  { name: 'Toner', href: '/shop?category=toner' },
  { name: 'Serum', href: '/shop?category=serum' },
  { name: 'Moisturizer', href: '/shop?category=moisturizer' },
  { name: 'Sunscreen', href: '/shop?category=sunscreen' },
  { name: 'Mask', href: '/shop?category=mask' },
  { name: 'Brands', href: '/brands' },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { user, logout } = useAuthStore();
  const { itemCount, fetchCart, resetCart } = useCartStore();

  useEffect(() => { fetchCart(); }, [fetchCart]);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = searchOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  // Active category from URL
  const getActiveNav = () => {
    if (pathname === '/') return 'Home';
    if (pathname === '/brands') return 'Brands';
    if (pathname === '/shop' || pathname.startsWith('/shop')) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('category');
        if (cat) {
          const found = navItems.find((c) => c.href.includes(`category=${cat}`));
          return found?.name ?? 'Shop All';
        }
      }
      return 'Shop All';
    }
    return '';
  };
  const [activeNav, setActiveNav] = useState('');
  useEffect(() => { setActiveNav(getActiveNav()); }, [pathname]);

  const handleLogout = async () => {
    await logout();
    resetCart();
    setUserMenuOpen(false);
    router.push('/');
  };

  return (
    <>
      {/* ── Announcement bar ─────────────────────────────────────── */}
      <div className="bg-primary-500 text-white text-center py-1.5 sm:py-2 text-xs sm:text-sm font-semibold tracking-wide overflow-hidden">
        <span className="block truncate px-4">
          Free shipping on orders over $30 &nbsp;·&nbsp; Use code{' '}
          <span className="underline underline-offset-2 font-extrabold">BLOOM10</span>{' '}
          for 10% off
        </span>
      </div>

      {/* ── Main header ──────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${
          scrolled ? 'shadow-pink-md' : 'border-b border-blush-200'
        }`}
      >
        <div className="container-shop">
          <div className="flex items-center justify-between h-14 lg:h-[60px]">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image src="/logo.png" alt="Blooming Beauty Skin" width={28} height={28} className="object-contain lg:w-9 lg:h-9" />
              <div className="leading-tight hidden sm:block">
                <span className="block text-base sm:text-lg lg:text-xl font-heading font-extrabold text-primary-600 tracking-tight">
                  Blooming Beauty
                </span>
                <span className="hidden md:block text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-primary-400 uppercase -mt-0.5">
                  Skin · Cosmetics
                </span>
              </div>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-0.5">

              {/* Search */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-full hover:bg-blush-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Open search"
              >
                <Search className="h-5 w-5 text-gray-500 hover:text-primary-500 transition-colors" />
              </button>

              {/* Wishlist */}
              <Link
                href="/dashboard?tab=wishlist"
                className="p-2 rounded-full hover:bg-blush-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5 text-gray-500 hover:text-primary-500 transition-colors" />
              </Link>

              {/* User / Account */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1 p-2 rounded-full hover:bg-blush-100 transition-colors min-w-[44px] min-h-[44px] justify-center"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-xs font-bold text-white shadow-pink-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className="h-3 w-3 text-gray-500 hidden sm:block" />
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-blush-200 rounded-3xl shadow-pink-md z-50 py-2 overflow-hidden">
                        <div className="px-4 py-3 border-b border-blush-100 bg-blush-50">
                          <p className="text-sm font-bold text-gray-800">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blush-50 hover:text-primary-600 transition-colors">
                          My Account
                        </Link>
                        <Link href="/dashboard?tab=orders" onClick={() => setUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blush-50 hover:text-primary-600 transition-colors">
                          My Orders
                        </Link>
                        {user.role === 'ADMIN' && (
                          <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blush-50 hover:text-primary-600 transition-colors">
                            Admin Panel
                          </Link>
                        )}
                        <div className="border-t border-blush-100 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="h-4 w-4" /> Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="p-2 rounded-full hover:bg-blush-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Login"
                >
                  <User className="h-5 w-5 text-gray-500 hover:text-primary-500 transition-colors" />
                </Link>
              )}

              {/* Cart */}
              <Link
                href="/cart"
                className="relative p-2 rounded-full hover:bg-blush-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Cart"
              >
                <ShoppingBag className="h-5 w-5 text-gray-500 hover:text-primary-500 transition-colors" />
                {itemCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white shadow-pink-sm">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Navigation sub-header bar (all screens) ───────────────── */}
      <div className="sticky top-14 lg:top-[60px] z-40 bg-white/95 backdrop-blur-md border-b border-blush-100">
        <div className="container-shop relative">
          <div className="flex gap-2 py-2.5 overflow-x-auto scrollbar-hide pr-8">
            {navItems.map((item) => {
              const isActive = item.name === activeNav;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150
                    ${isActive
                      ? 'bg-primary-500 text-white shadow-pink-sm'
                      : 'bg-blush-100 text-gray-600 hover:bg-blush-200 hover:text-primary-600'
                    }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/95 to-transparent lg:hidden" />
        </div>
      </div>

      {/* ── Full-screen search overlay (mobile) ───────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-blush-100">
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
              className="p-2 rounded-full hover:bg-blush-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 px-4 py-2.5 text-base rounded-full border border-blush-200 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')}
                  className="p-2 rounded-full hover:bg-blush-100">
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {['Cleanser', 'Sunscreen', 'Serum', 'Moisturizer', 'COSRX', 'Vitamin C', 'SPF'].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    router.push(`/shop?search=${encodeURIComponent(term)}`);
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="rounded-full bg-blush-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-blush-200 hover:text-primary-600 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop search overlay ────────────────────────────────── */}
      {searchOpen && (
        <div className="hidden lg:flex fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm items-start justify-center pt-24">
          <div className="w-full max-w-lg bg-white rounded-4xl shadow-pink-lg p-6">
            <form onSubmit={handleSearch} className="flex items-center gap-3">
              <Search className="h-5 w-5 text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 text-lg outline-none placeholder:text-gray-400"
              />
              <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="p-2 rounded-full hover:bg-blush-100 transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </form>
            <div className="mt-4 pt-4 border-t border-blush-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Popular searches</p>
              <div className="flex flex-wrap gap-2">
                {['Cleanser', 'Sunscreen', 'Serum', 'Moisturizer', 'COSRX'].map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      router.push(`/shop?search=${encodeURIComponent(term)}`);
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="rounded-full bg-blush-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-blush-200 hover:text-primary-600 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
