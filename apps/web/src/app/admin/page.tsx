'use client';

import Link from 'next/link';
import {
  Image, Package, ShoppingBag, Tag, ArrowRight, Flower2,
  FolderTree, Star, Users, DollarSign, Clock, Truck,
  AlertTriangle, Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Quick Links ───────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { title: 'Banners',    desc: 'Manage homepage hero slider',  href: '/admin/banners',    icon: Image,      bg: 'bg-primary-50', ic: 'text-primary-500' },
  { title: 'Categories', desc: 'Organize product categories',  href: '/admin/categories', icon: FolderTree, bg: 'bg-emerald-50', ic: 'text-emerald-500' },
  { title: 'Brands',     desc: 'Manage your brands',           href: '/admin/brands',     icon: Star,       bg: 'bg-amber-50',   ic: 'text-amber-500' },
  { title: 'Products',   desc: 'Add and manage products',      href: '/admin/products',   icon: Package,    bg: 'bg-sky-50',     ic: 'text-sky-400' },
  { title: 'Orders',     desc: 'View and update orders',       href: '/admin/orders',     icon: ShoppingBag, bg: 'bg-peach-100', ic: 'text-peach-300' },
  { title: 'Coupons',    desc: 'Manage discount codes',        href: '/admin/coupons',    icon: Tag,        bg: 'bg-blush-100',  ic: 'text-primary-400' },
  { title: 'Customers',  desc: 'View customer accounts',       href: '/admin/customers',  icon: Users,      bg: 'bg-violet-50',  ic: 'text-violet-500' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-600',
  CONFIRMED: 'bg-blue-50 text-blue-600',
  PROCESSING: 'bg-indigo-50 text-indigo-600',
  SHIPPING: 'bg-purple-50 text-purple-600',
  DELIVERED: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-red-50 text-red-600',
};

function formatMoney(v: number) {
  return `$${v.toFixed(2)}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Dashboard Page ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data: statsRes, isLoading } = useQuery({
    queryKey: ['adminDashboardStats'],
    queryFn: () => api.get('/admin/stats'),
  });

  const stats = statsRes?.data?.data;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-extrabold text-gray-900 flex items-center gap-2">
          <Flower2 className="h-7 w-7 text-primary-500" /> Welcome back!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your Blooming Beauty Skin store from here.
        </p>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 mb-6">
          <Loader2 className="h-6 w-6 text-primary-400 animate-spin" />
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="rounded-2xl border border-blush-100 bg-white p-4 shadow-pink-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-xl bg-primary-50 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary-500" />
              </div>
              <span className="text-xs font-bold text-gray-500">Revenue</span>
            </div>
            <p className="text-xl font-extrabold text-gray-900">{formatMoney(stats.totalRevenue)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Last 30 days: {formatMoney(stats.revenueLast30d)}</p>
          </div>

          <div className="rounded-2xl border border-blush-100 bg-white p-4 shadow-pink-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-xs font-bold text-gray-500">Pending Orders</span>
            </div>
            <p className="text-xl font-extrabold text-amber-600">{stats.pendingOrders}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{stats.totalOrders} total orders</p>
          </div>

          <div className="rounded-2xl border border-blush-100 bg-white p-4 shadow-pink-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-violet-500" />
              </div>
              <span className="text-xs font-bold text-gray-500">Customers</span>
            </div>
            <p className="text-xl font-extrabold text-gray-900">{stats.totalCustomers}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">+{stats.newCustomers30d} new this month</p>
          </div>

          <div className="rounded-2xl border border-blush-100 bg-white p-4 shadow-pink-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-xl bg-sky-50 flex items-center justify-center">
                <Package className="h-4 w-4 text-sky-500" />
              </div>
              <span className="text-xs font-bold text-gray-500">Products</span>
            </div>
            <p className="text-xl font-extrabold text-gray-900">{stats.totalProducts}</p>
            {stats.lowStockProducts > 0 && (
              <p className="text-[11px] text-red-500 font-semibold mt-0.5 flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3" /> {stats.lowStockProducts} low stock
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        {stats?.recentOrders?.length > 0 && (
          <div className="lg:col-span-2 rounded-2xl border border-blush-100 bg-white p-5 shadow-pink-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Recent Orders</h2>
              <Link href="/admin/orders" className="text-xs font-bold text-primary-500 hover:text-primary-700 flex items-center gap-0.5">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recentOrders.map((order: any) => {
                const statusColor = STATUS_COLORS[order.status] ?? 'bg-gray-50 text-gray-600';
                const itemCount = order.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) ?? 0;
                return (
                  <div key={order.id} className="flex items-center justify-between rounded-xl bg-blush-50/50 px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{order.user?.name ?? 'Unknown'}</p>
                        <p className="text-[11px] text-gray-400">{formatDate(order.createdAt)} - {itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{formatMoney(Number(order.total))}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="rounded-2xl border border-blush-100 bg-white p-5 shadow-pink-sm">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Quick Links</h2>
          <div className="space-y-2">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-blush-50 transition-colors group"
              >
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${item.bg}`}>
                  <item.icon className={`h-4 w-4 ${item.ic}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 group-hover:text-primary-600 transition-colors">{item.title}</p>
                  <p className="text-[11px] text-gray-400 truncate">{item.desc}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
