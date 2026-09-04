'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Loader2, Search, Users, ChevronLeft, ChevronRight,
  X, Mail, Phone, MapPin, Calendar, DollarSign, ShoppingBag,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
}

interface Address {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  isDefault: boolean;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  items: { quantity: number; price: string }[];
}

interface CustomerDetail extends Customer {
  addresses: Address[];
  orders: OrderSummary[];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(v: number | string) {
  return `$${parseFloat(v.toString()).toFixed(2)}`;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-600',
  CONFIRMED: 'bg-blue-50 text-blue-600',
  PROCESSING: 'bg-indigo-50 text-indigo-600',
  SHIPPING: 'bg-purple-50 text-purple-600',
  DELIVERED: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-red-50 text-red-600',
  REFUNDED: 'bg-gray-50 text-gray-600',
};

// ── Customer Detail Modal ────────────────────────────────────────────────────

function CustomerDetailModal({
  customerId,
  onClose,
}: {
  customerId: string;
  onClose: () => void;
}) {
  const { data: res, isLoading } = useQuery({
    queryKey: ['adminCustomer', customerId],
    queryFn: () => api.get(`/admin/customers/${customerId}`),
  });

  const customer: CustomerDetail | undefined = res?.data?.data?.customer;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-4xl shadow-pink-lg mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100 sticky top-0 bg-white rounded-t-4xl z-10">
          <h2 className="font-heading font-extrabold text-gray-900 text-lg">Customer Detail</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-blush-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
          </div>
        ) : !customer ? (
          <div className="py-20 text-center text-gray-500">Customer not found</div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* Profile */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary-500 flex items-center justify-center text-xl font-bold text-white shrink-0">
                {customer.avatar ? (
                  <div className="h-full w-full rounded-full overflow-hidden relative">
                    <Image src={customer.avatar} alt="" fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  customer.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{customer.email}</span>
                  {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{customer.phone}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Joined {formatDate(customer.createdAt)}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-blush-100 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-gray-500">Total Spent</span>
                </div>
                <p className="text-xl font-extrabold text-emerald-600">{formatMoney(customer.totalSpent)}</p>
              </div>
              <div className="rounded-2xl border border-blush-100 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag className="h-4 w-4 text-primary-400" />
                  <span className="text-xs font-bold text-gray-500">Total Orders</span>
                </div>
                <p className="text-xl font-extrabold text-gray-900">{customer.totalOrders}</p>
              </div>
            </div>

            {/* Addresses */}
            {customer.addresses.length > 0 && (
              <div className="rounded-2xl border border-blush-100 p-4">
                <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Saved Addresses</p>
                <div className="space-y-2">
                  {customer.addresses.map((addr) => (
                    <div key={addr.id} className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-800">{addr.name} - {addr.phone}</p>
                        <p className="text-gray-600">{addr.street}, {addr.city}, {addr.province}</p>
                        {addr.isDefault && <span className="text-[11px] text-primary-500 font-semibold">Default</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="rounded-2xl border border-blush-100 p-4">
              <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Recent Orders</p>
              {customer.orders.length === 0 ? (
                <p className="text-sm text-gray-400">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {customer.orders.map((o) => {
                    const statusColor = STATUS_COLORS[o.status] ?? 'bg-gray-50 text-gray-600';
                    return (
                      <div key={o.id} className="flex items-center justify-between rounded-xl bg-blush-50/50 px-3 py-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{o.orderNumber}</p>
                          <p className="text-[11px] text-gray-400">{formatDate(o.createdAt)} - {o.items.length} item{o.items.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{formatMoney(o.total)}</p>
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>
                            {o.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Customers Page ──────────────────────────────────────────────────────

export default function AdminCustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['adminCustomers', page, search],
    queryFn: () => api.get('/admin/customers', { params: { page, limit: 15, search: search || undefined } }),
  });

  const customers: Customer[] = res?.data?.data?.customers ?? [];
  const pagination = res?.data?.data?.pagination ?? { page: 1, total: 0, totalPages: 1 };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-gray-900">Customers</h1>
        <p className="mt-1 text-sm text-gray-500">View and manage your customer base.</p>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, phone..."
            className="input-field w-full pl-9" />
        </div>
        <div className="text-xs text-gray-400 flex items-center">
          {pagination.total} customer{pagination.total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-12 w-12 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500 text-lg">
            {search ? 'No customers match your search' : 'No customers yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Try a different search term.' : 'Customers will appear here when they register.'}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-blush-100 bg-white shadow-pink-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blush-100 bg-blush-50/50">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Orders</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Spent</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blush-50">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-blush-50/30 transition-colors cursor-pointer"
                      onClick={() => setDetailCustomerId(c.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {c.avatar ? (
                              <div className="h-full w-full rounded-full overflow-hidden relative">
                                <Image src={c.avatar} alt="" fill className="object-cover" unoptimized />
                              </div>
                            ) : (
                              c.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.phone || '-'}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{c.totalOrders}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{formatMoney(c.totalSpent)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-xs font-bold text-primary-500 hover:text-primary-700">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-gray-400">
                Showing {(page - 1) * 15 + 1}-{Math.min(page * 15, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="flex items-center gap-1 rounded-full border border-blush-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-blush-50 disabled:opacity-40">
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
                  className="flex items-center gap-1 rounded-full border border-blush-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-blush-50 disabled:opacity-40">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {detailCustomerId && (
        <CustomerDetailModal
          customerId={detailCustomerId}
          onClose={() => setDetailCustomerId(null)}
        />
      )}
    </div>
  );
}
