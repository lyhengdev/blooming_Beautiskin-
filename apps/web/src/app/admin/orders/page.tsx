'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Loader2, Search, ShoppingBag, Clock, Package, Truck,
  CheckCircle2, XCircle, RotateCcw, ChevronLeft, ChevronRight,
  X, DollarSign, Eye, Calendar,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  quantity: number;
  price: string;
  product: { name: string; images: { url: string }[] };
  variant?: { name: string } | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  shippingCost: string;
  discount: string;
  total: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  notes: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  items: OrderItem[];
  payment?: { method: string; status: string; amount: string } | null;
  _count: { items: number };
}

interface OrderDetail extends Order {
  items: OrderItem[];
  payment?: { method: string; status: string; amount: string; transactionId?: string } | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:    { label: 'Pending',    color: 'text-amber-600',  bg: 'bg-amber-50',   icon: Clock },
  CONFIRMED:  { label: 'Confirmed',  color: 'text-blue-600',   bg: 'bg-blue-50',    icon: CheckCircle2 },
  PROCESSING: { label: 'Processing', color: 'text-indigo-600', bg: 'bg-indigo-50',  icon: Package },
  SHIPPING:   { label: 'Shipping',   color: 'text-purple-600', bg: 'bg-purple-50',  icon: Truck },
  DELIVERED:  { label: 'Delivered',  color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  CANCELLED:  { label: 'Cancelled',  color: 'text-red-600',    bg: 'bg-red-50',     icon: XCircle },
  REFUNDED:   { label: 'Refunded',   color: 'text-gray-600',   bg: 'bg-gray-50',    icon: RotateCcw },
};

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMoney(v: string) {
  return `$${parseFloat(v).toFixed(2)}`;
}

// ── Order Detail Modal ───────────────────────────────────────────────────────

function OrderDetailModal({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState('');

  const { data: orderRes, isLoading } = useQuery({
    queryKey: ['adminOrder', orderId],
    queryFn: () => api.get(`/orders/admin/${orderId}`),
  });

  const order: OrderDetail | undefined = orderRes?.data?.data?.order;

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/orders/admin/${orderId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminOrder', orderId] });
      queryClient.invalidateQueries({ queryKey: ['adminOrderStats'] });
      toast.success('Order status updated');
      setNewStatus('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    },
  });

  // Allowed transitions
  const allowedTransitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPING', 'CANCELLED'],
    SHIPPING: ['DELIVERED', 'CANCELLED'],
    DELIVERED: ['REFUNDED'],
    CANCELLED: [],
    REFUNDED: [],
  };

  const nextStatuses = order ? allowedTransitions[order.status] ?? [] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-4xl shadow-pink-lg mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100 sticky top-0 bg-white rounded-t-4xl z-10">
          <div>
            <h2 className="font-heading font-extrabold text-gray-900 text-lg">
              {order ? `Order ${order.orderNumber}` : 'Loading...'}
            </h2>
            {order && (
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-blush-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
          </div>
        ) : !order ? (
          <div className="py-20 text-center text-gray-500">Order not found</div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* Status + Customer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Status */}
              <div className="rounded-2xl border border-blush-100 p-4">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Status</p>
                <div className="flex items-center gap-2 mb-3">
                  {(() => {
                    const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
                    const Icon = cfg.icon;
                    return (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                        <Icon className="h-3.5 w-3.5" /> {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                {nextStatuses.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="input-field flex-1 text-sm"
                    >
                      <option value="">Update status...</option>
                      {nextStatuses.map((s) => (
                        <option key={s} value={s}>{STATUS_CONFIG[s]?.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => newStatus && statusMutation.mutate(newStatus)}
                      disabled={!newStatus || statusMutation.isPending}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                    </button>
                  </div>
                )}
              </div>

              {/* Customer */}
              <div className="rounded-2xl border border-blush-100 p-4">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Customer</p>
                <p className="text-sm font-bold text-gray-900">{order.user.name}</p>
                <p className="text-xs text-gray-500">{order.user.email}</p>
              </div>
            </div>

            {/* Shipping */}
            <div className="rounded-2xl border border-blush-100 p-4">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Shipping Address</p>
              <p className="text-sm text-gray-700">{order.shippingName} - {order.shippingPhone}</p>
              <p className="text-sm text-gray-600">{order.shippingAddress}</p>
              <p className="text-xs text-gray-500">{order.shippingCity}, {order.shippingProvince}</p>
              {order.notes && (
                <p className="mt-2 text-xs text-gray-500 italic bg-blush-50 rounded-xl px-3 py-2">
                  Note: {order.notes}
                </p>
              )}
            </div>

            {/* Items */}
            <div className="rounded-2xl border border-blush-100 p-4">
              <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Items ({order.items.length})</p>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-blush-50 shrink-0 relative">
                      {item.product.images[0] ? (
                        <Image src={item.product.images[0].url} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-5 w-5 text-blush-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.product.name}</p>
                      {item.variant && <p className="text-[11px] text-gray-400">{item.variant.name}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatMoney(item.price)}</p>
                      <p className="text-[11px] text-gray-400">x{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment + Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-blush-100 p-4">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Payment</p>
                <p className="text-sm text-gray-700">{order.payment?.method?.replace('_', ' ') || 'N/A'}</p>
                <p className={`text-xs font-semibold mt-1 ${order.payment?.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {order.payment?.status || 'N/A'}
                </p>
              </div>

              <div className="rounded-2xl border border-blush-100 p-4">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Totals</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Subtotal</span><span>{formatMoney(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Shipping</span><span>{order.shippingCost === '0' ? 'Free' : formatMoney(order.shippingCost)}</span>
                  </div>
                  {order.discount !== '0' && (
                    <div className="flex justify-between text-xs text-emerald-600">
                      <span>Discount</span><span>-{formatMoney(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-1 border-t border-blush-100">
                    <span>Total</span><span>{formatMoney(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Orders Page ─────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<string>('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Compute date range from preset
  const dateRange = useMemo(() => {
    if (datePreset === 'custom' && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd + 'T23:59:59' };
    }
    const now = new Date();
    if (datePreset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (datePreset === '7d') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (datePreset === '30d') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    return undefined;
  }, [datePreset, customStart, customEnd]);

  const { data: statsRes } = useQuery({
    queryKey: ['adminOrderStats', dateRange],
    queryFn: () => api.get('/orders/admin/stats', { params: dateRange }),
  });
  const stats = statsRes?.data?.data;

  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ['adminOrders', page, search, filterStatus, dateRange],
    queryFn: () => api.get('/orders/admin', { params: { page, limit: 15, search: search || undefined, status: filterStatus || undefined, ...dateRange } }),
  });

  const orders: Order[] = ordersRes?.data?.data?.orders ?? [];
  const pagination = ordersRes?.data?.data?.pagination ?? { page: 1, total: 0, totalPages: 1 };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-gray-500">View and manage customer orders.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl border border-blush-100 bg-white p-4 shadow-pink-sm">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="h-4 w-4 text-primary-400" />
              <span className="text-xs font-bold text-gray-500">Total Orders</span>
            </div>
            <p className="text-xl font-extrabold text-gray-900">{stats.totalOrders}</p>
          </div>
          <div className="rounded-2xl border border-blush-100 bg-white p-4 shadow-pink-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-gray-500">Pending</span>
            </div>
            <p className="text-xl font-extrabold text-amber-600">{stats.pendingOrders}</p>
          </div>
          <div className="rounded-2xl border border-blush-100 bg-white p-4 shadow-pink-sm">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-gray-500">Revenue</span>
            </div>
            <p className="text-xl font-extrabold text-emerald-600">{formatMoney(stats.totalRevenue.toString())}</p>
          </div>
          <div className="rounded-2xl border border-blush-100 bg-white p-4 shadow-pink-sm">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-gray-500">In Transit</span>
            </div>
            <p className="text-xl font-extrabold text-purple-600">{(stats.statusCounts?.SHIPPING ?? 0)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search order number, name, phone..."
            className="input-field w-full pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setFilterStatus(''); setPage(1); }}
            className={`rounded-full px-3 py-2 text-xs font-bold transition-colors ${!filterStatus ? 'bg-primary-500 text-white' : 'bg-blush-100 text-gray-600 hover:bg-blush-200'}`}>
            All
          </button>
          {STATUS_OPTIONS.filter((s) => s !== 'REFUNDED').map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => { setFilterStatus(filterStatus === s ? '' : s); setPage(1); }}
                className={`rounded-full px-3 py-2 text-xs font-bold transition-colors ${filterStatus === s ? 'bg-primary-500 text-white' : `${cfg.bg} ${cfg.color} hover:opacity-80`}`}>
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="h-4 w-4 text-gray-400" />
          {[
            { key: 'today', label: 'Today' },
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '1 Month' },
            { key: 'custom', label: 'Custom' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                if (datePreset === opt.key) {
                  setDatePreset('');
                  setCustomStart('');
                  setCustomEnd('');
                } else {
                  setDatePreset(opt.key);
                }
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                datePreset === opt.key
                  ? 'bg-primary-500 text-white'
                  : 'bg-blush-50 text-gray-600 hover:bg-blush-100 border border-blush-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom date range inputs */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => { setCustomStart(e.target.value); setPage(1); }}
              className="input-field text-xs py-1.5 px-3"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }}
              className="input-field text-xs py-1.5 px-3"
            />
          </div>
        )}

        {/* Active date range indicator */}
        {datePreset && datePreset !== 'custom' && (
          <p className="text-[11px] text-gray-400">
            Showing orders from {datePreset === 'today' ? 'today' : datePreset === '7d' ? 'last 7 days' : 'last 30 days'}
          </p>
        )}
        {datePreset === 'custom' && customStart && customEnd && (
          <p className="text-[11px] text-gray-400">
            {customStart} to {customEnd}
          </p>
        )}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag className="h-12 w-12 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500 text-lg">
            {search || filterStatus || datePreset ? 'No orders match your filters' : 'No orders yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search || filterStatus || datePreset ? 'Try adjusting your search, filters, or date range.' : 'Orders will appear here when customers place them.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
              const Icon = cfg.icon;
              return (
                <div
                  key={order.id}
                  className="group rounded-2xl border border-blush-100 bg-white px-4 py-3 shadow-pink-sm hover:shadow-pink-md transition-all cursor-pointer"
                  onClick={() => setDetailOrderId(order.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Status icon */}
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Icon className={`h-5 w-5 ${cfg.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-gray-900">{order.orderNumber}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {order.shippingName} - {order.shippingCity}, {order.shippingProvince}
                      </p>
                      <p className="text-[11px] text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>

                    {/* Items count + Total */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-gray-900">{formatMoney(order.total)}</p>
                      <p className="text-[11px] text-gray-400">{order._count.items} item{order._count.items !== 1 ? 's' : ''}</p>
                    </div>

                    {/* View */}
                    <Eye className="h-4 w-4 text-gray-300 group-hover:text-primary-500 transition-colors shrink-0" />
                  </div>
                </div>
              );
            })}
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

      {/* Order Detail Modal */}
      {detailOrderId && (
        <OrderDetailModal
          orderId={detailOrderId}
          onClose={() => setDetailOrderId(null)}
        />
      )}
    </div>
  );
}
