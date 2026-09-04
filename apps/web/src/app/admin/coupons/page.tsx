'use client';

import { useState, useMemo } from 'react';
import {
  Plus, Trash2, Pencil, Loader2, Tag, Search,
  Eye, EyeOff, Percent, DollarSign, X, AlertTriangle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Coupon {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: string;
  minOrder: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt?: string;
}

// ── Coupon Form Modal ────────────────────────────────────────────────────────

function CouponFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Coupon | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(initial?.code ?? '');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>(initial?.type ?? 'PERCENTAGE');
  const [value, setValue] = useState(initial?.value?.toString() ?? '');
  const [minOrder, setMinOrder] = useState(initial?.minOrder?.toString() ?? '');
  const [maxUses, setMaxUses] = useState(initial?.maxUses?.toString() ?? '');
  const [expiresAt, setExpiresAt] = useState(
    initial?.expiresAt ? new Date(initial.expiresAt).toISOString().slice(0, 16) : ''
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      initial
        ? api.put(`/coupons/admin/${initial.id}`, payload)
        : api.post('/coupons/admin', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
      toast.success(initial ? 'Coupon updated' : 'Coupon created');
      onSaved();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Failed to save coupon');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setError('Code is required'); return; }
    if (!value || parseFloat(value) <= 0) { setError('Value must be positive'); return; }
    if (type === 'PERCENTAGE' && parseFloat(value) > 100) { setError('Percentage cannot exceed 100'); return; }
    setError('');

    saveMutation.mutate({
      code: code.trim().toUpperCase(),
      type,
      value,
      minOrder: minOrder || null,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-4xl shadow-pink-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100">
          <h2 className="font-heading font-extrabold text-gray-900 text-lg">
            {initial ? 'Edit Coupon' : 'Add Coupon'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-blush-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {/* Code */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Coupon Code <span className="text-red-400">*</span>
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SUMMER20"
              className="input-field w-full font-mono text-lg tracking-widest"
              autoFocus
            />
            <p className="mt-1 text-[11px] text-gray-400">Automatically converted to uppercase.</p>
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="input-field w-full">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Value <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {type === 'PERCENTAGE' ? <Percent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={type === 'PERCENTAGE' ? 100 : undefined}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="input-field w-full pl-9"
                  placeholder={type === 'PERCENTAGE' ? '20' : '5.00'}
                />
              </div>
            </div>
          </div>

          {/* Min Order + Max Uses */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Min Order ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="input-field w-full"
                placeholder="No minimum"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Max Uses</label>
              <input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="input-field w-full"
                placeholder="Unlimited"
              />
              {initial && (
                <p className="mt-1 text-[11px] text-gray-400">
                  {initial.usedCount} used so far
                </p>
              )}
            </div>
          </div>

          {/* Expires At + Active */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Expires At</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="input-field w-full"
              />
              <p className="mt-1 text-[11px] text-gray-400">Leave blank for no expiry.</p>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-blush-300 text-primary-500 focus:ring-primary-400"
                />
                <span className="text-sm font-semibold text-gray-700">Active</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          {code && value && (
            <div className="rounded-2xl border border-blush-200 bg-blush-50 p-4">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Preview</p>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-500 px-3 py-2">
                  <p className="text-sm font-extrabold text-white tracking-wider font-mono">{code.trim().toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {type === 'PERCENTAGE' ? `${value}% off` : `$${parseFloat(value).toFixed(2)} off`}
                  </p>
                  {minOrder && <p className="text-[11px] text-gray-500">Min. order ${parseFloat(minOrder).toFixed(2)}</p>}
                  {expiresAt && <p className="text-[11px] text-gray-500">Expires {new Date(expiresAt).toLocaleDateString()}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-blush-100">
            <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending || !code.trim()}
              className="btn-primary px-5 py-2.5 text-sm">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

function DeleteConfirmModal({
  coupon,
  onClose,
  onDeleted,
}: {
  coupon: Coupon;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/coupons/admin/${coupon.id}`),
    onSuccess: () => {
      toast.success('Coupon deleted');
      queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
      onDeleted();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete coupon');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-4xl shadow-pink-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <Trash2 className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-gray-900">Delete Coupon</h3>
            <p className="text-xs text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete <span className="font-bold font-mono">{coupon.code}</span>?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={deleteMutation.isPending}
            className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
          <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white
                       hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm">
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Coupons Page ────────────────────────────────────────────────────────

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [deleteCoupon, setDeleteCoupon] = useState<Coupon | null>(null);
  const [search, setSearch] = useState('');

  const { data: couponsRes, isLoading: loading } = useQuery({
    queryKey: ['adminCoupons'],
    queryFn: () => api.get('/coupons/admin'),
  });

  const coupons: Coupon[] = couponsRes?.data?.data?.coupons ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return coupons;
    const q = search.toLowerCase();
    return coupons.filter((c) => c.code.toLowerCase().includes(q));
  }, [coupons, search]);

  const toggleMutation = useMutation({
    mutationFn: (c: Coupon) => api.patch(`/coupons/admin/${c.id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
      toast.success('Coupon updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const handleSaved = () => { setShowForm(false); setEditCoupon(null); };

  const now = new Date();
  const activeCoupons = coupons.filter((c) => c.isActive);
  const expiredCoupons = coupons.filter((c) => c.expiresAt && new Date(c.expiresAt) < now);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-gray-900">Coupons</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage discount codes for your store.</p>
        </div>
        <button onClick={() => { setEditCoupon(null); setShowForm(true); }} className="btn-primary px-5 py-2.5 text-sm">
          <Plus className="h-4 w-4" /> Add Coupon
        </button>
      </div>

      {/* Search + Stats */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coupon codes..." className="input-field w-full pl-9" />
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-3">
          <span>{activeCoupons.length} active</span>
          <span>{expiredCoupons.length} expired</span>
          <span>{coupons.length} total</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Tag className="h-12 w-12 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500 text-lg">No coupons yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first discount code to get started.</p>
          <button onClick={() => { setEditCoupon(null); setShowForm(true); }}
            className="btn-primary px-5 py-2.5 text-sm mt-4">
            <Plus className="h-4 w-4" /> Add Coupon
          </button>
        </div>
      ) : filtered.length === 0 && search ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="h-10 w-10 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500">No results for &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-blush-100 bg-white shadow-pink-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blush-100 bg-blush-50/50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Usage</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blush-50">
                {filtered.map((c) => {
                  const isExpired = c.expiresAt && new Date(c.expiresAt) < now;
                  return (
                    <tr key={c.id} className={`hover:bg-blush-50/30 transition-colors ${!c.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-gray-900 tracking-wider">{c.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold
                          ${c.type === 'PERCENTAGE' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {c.type === 'PERCENTAGE' ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                          {c.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {c.type === 'PERCENTAGE' ? `${c.value}%` : `$${parseFloat(c.value).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''} uses
                        {c.minOrder && <span className="block text-[11px] text-gray-400">Min ${parseFloat(c.minOrder).toFixed(2)}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.expiresAt ? (
                          <span className={isExpired ? 'text-red-500 font-semibold' : ''}>
                            {new Date(c.expiresAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                            <AlertTriangle className="h-3 w-3" /> Expired
                          </span>
                        ) : c.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleMutation.mutate(c)}
                            className="p-1.5 rounded-full hover:bg-blush-100 text-gray-400 hover:text-primary-600 transition-colors"
                            title={c.isActive ? 'Deactivate' : 'Activate'}>
                            {c.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => { setEditCoupon(c); setShowForm(true); }}
                            className="p-1.5 rounded-full hover:bg-blush-100 text-gray-400 hover:text-primary-600 transition-colors"
                            title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteCoupon(c)}
                            className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <CouponFormModal
          initial={editCoupon}
          onClose={() => { setShowForm(false); setEditCoupon(null); }}
          onSaved={handleSaved}
        />
      )}
      {deleteCoupon && (
        <DeleteConfirmModal
          coupon={deleteCoupon}
          onClose={() => setDeleteCoupon(null)}
          onDeleted={() => setDeleteCoupon(null)}
        />
      )}
    </div>
  );
}
