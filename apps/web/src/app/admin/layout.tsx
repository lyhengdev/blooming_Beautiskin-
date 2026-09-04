'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Image as ImageIcon, Package, ShoppingBag,
  Tag, Users, FileText, Menu, X, LogOut,
  ChevronRight, Flower2, FolderTree, Star, MessageSquare,
  PanelLeftClose, PanelLeftOpen, Mail, Send, ShoppingCart,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

const NAV: { label: string; href: string; icon: any; badgeKey?: string }[] = [
  { label: 'Dashboard',  href: '/admin',             icon: LayoutDashboard },
  { label: 'Banners',    href: '/admin/banners',      icon: ImageIcon      },
  { label: 'Categories', href: '/admin/categories',   icon: FolderTree     },
  { label: 'Brands',     href: '/admin/brands',       icon: Star           },
  { label: 'Products',   href: '/admin/products',     icon: Package        },
  { label: 'Orders',     href: '/admin/orders',       icon: ShoppingBag    },
  { label: 'Online Selling', href: '/admin/online-selling', icon: ShoppingCart },
  { label: 'Coupons',    href: '/admin/coupons',      icon: Tag            },
  { label: 'Customers',  href: '/admin/customers',    icon: Users          },
  { label: 'Blog',       href: '/admin/blog',         icon: FileText       },
  { label: 'Reviews',    href: '/admin/reviews',      icon: MessageSquare, badgeKey: 'reviews' },
  { label: 'Messages',   href: '/admin/messages',     icon: Mail,          badgeKey: 'messages' },
  { label: 'Subscribers',href: '/admin/subscribers',  icon: Send           },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, loadUser, logout, isInitialized } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => { loadUser(); }, [loadUser]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user || user.role !== 'ADMIN') router.replace('/login?returnTo=/admin');
  }, [isInitialized, user, router]);

  // Fetch badge counts periodically
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    const fetchBadges = async () => {
      try {
        const [reviewsRes, messagesRes] = await Promise.all([
          api.get('/reviews/admin/stats'),
          api.get('/contact/admin/unread-count'),
        ]);
        setBadges({
          reviews: reviewsRes?.data?.data?.pending ?? 0,
          messages: messagesRes?.data?.data?.count ?? 0,
        });
      } catch { /* ignore */ }
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!isInitialized || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex h-screen items-center justify-center bg-blush-50">
        <div className="flex flex-col items-center gap-3">
          <Flower2 className="h-10 w-10 text-primary-400 animate-spin" />
          <p className="text-sm text-gray-500">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => { await logout(); router.push('/'); };
  const sidebarWidth = collapsed ? 'w-[68px]' : 'w-64';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-blush-200 shadow-pink-sm
                          transition-all duration-300 lg:static lg:translate-x-0
                          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarWidth} lg:${sidebarWidth}`}>

        {/* Logo */}
        <div className={`flex items-center border-b border-blush-100 ${collapsed ? 'justify-center px-2 py-5' : 'gap-2.5 px-5 py-5'}`}>
          <NextImage src="/logo.png" alt="Blooming Beauty Skin" width={28} height={28} className="object-contain shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-heading font-extrabold text-primary-600 leading-tight text-sm">Blooming Beauty</p>
              <p className="text-[10px] font-bold tracking-widest text-primary-400 uppercase">Admin Panel</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(false)} className="ml-auto p-1.5 rounded-full hover:bg-blush-100 lg:hidden">
            <X className="h-4 w-4 text-gray-500" />
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex ml-auto p-1.5 rounded-full hover:bg-blush-100 text-gray-400 hover:text-gray-600 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map(({ label, href, icon: Icon, badgeKey }) => {
            const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
            const count = badgeKey ? (badges[badgeKey] ?? 0) : 0;
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-2xl font-semibold transition-all duration-150 group relative
                            ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5 text-sm'}
                            ${isActive ? 'bg-primary-500 text-white shadow-pink-sm' : 'text-gray-600 hover:bg-blush-100 hover:text-primary-600'}`}>
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="truncate">{label}</span>
                    {count > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                    {!count && isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-70" />}
                  </>
                )}
                {collapsed && count > 0 && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-blush-100 px-3 py-4">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-blush-50 px-3 py-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-800">{user.name}</p>
                  <p className="truncate text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
              <button onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </>
          ) : (
            <button onClick={handleLogout} title="Sign Out"
              className="flex w-full items-center justify-center rounded-2xl p-2.5 text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-blush-200 bg-white px-4 shadow-pink-sm">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-full hover:bg-blush-100 transition-colors lg:hidden" aria-label="Open sidebar">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          {!sidebarOpen && (
            <button onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-2 rounded-full hover:bg-blush-100 transition-colors text-gray-500"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
            </button>
          )}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 min-w-0">
            <Link href="/admin" className="font-semibold text-primary-500 hover:underline shrink-0">Admin</Link>
            {pathname !== '/admin' && (
              <>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold text-gray-700 capitalize truncate">{pathname.split('/').pop()}</span>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blush-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-blush-50 transition-colors">
              View Store ↗
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
