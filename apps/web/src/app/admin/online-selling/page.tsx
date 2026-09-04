'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Loader2, Search, Plus, Minus, Trash2, X, Package,
  ShoppingCart, User, Phone, MapPin, DollarSign,
  MessageSquare, CheckCircle2, ChevronDown, Users,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

const PROVINCES = [
  'Phnom Penh', 'Battambang', 'Siem Reap', 'Sihanoukville', 'Kampot',
  'Kandal', 'Prey Veng', 'Kampong Cham', 'Kampong Speu', 'Koh Kong',
];

const PAYMENT_METHODS = [
  { value: 'CASH_ON_DELIVERY', label: 'Cash on Delivery' },
  { value: 'WING', label: 'Wing Money' },
  { value: 'ABA_PAY', label: 'ABA Pay' },
  { value: 'CREDIT_CARD', label: 'Credit / Debit Card' },
];

interface Product {
  id: string;
  name: string;
  slug: string;
  price: string;
  stock: number;
  trackStock: boolean;
  isActive: boolean;
  images: { id: string; url: string; alt?: string }[];
  variants?: {
    id: string;
    name: string;
    price?: string;
    stock: number;
  }[];
}

interface CartLine {
  product: Product;
  qty: number;
  overridePrice: number | null;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export default function OnlineSellingPage() {
  const queryClient = useQueryClient();

  // Product search
  const [search, setSearch] = useState('');
  const { data: productsRes, isLoading: loadingProducts } = useQuery({
    queryKey: ['onlineSellingProducts', search],
    queryFn: () =>
      api.get('/products/admin', {
        params: { limit: 50, isActive: true, search: search || undefined, sort: 'name' },
      }),
  });
  const products: Product[] = productsRes?.data?.data?.products ?? [];

  // Cart
  const [cart, setCart] = useState<CartLine[]>([]);

  // Customer form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('1.50');
  const [paymentMethod, setPaymentMethod] = useState('WING');

  // Confirmation modal
  const [showConfirm, setShowConfirm] = useState(false);

  // Customer picker
  const [selectedUserId, setSelectedUserId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const { data: customersRes } = useQuery({
    queryKey: ['onlineSellingCustomers', customerSearch],
    queryFn: () => api.get('/admin/customers', { params: { limit: 20, search: customerSearch || undefined } }),
    enabled: showCustomerDropdown,
  });
  const customers: Customer[] = customersRes?.data?.data?.customers ?? [];

  const subtotal = useMemo(
    () => cart.reduce((sum, l) => sum + (l.overridePrice ?? Number(l.product.price)) * l.qty, 0),
    [cart],
  );
  const delivery = parseFloat(deliveryFee) || 0;
  const total = subtotal + delivery;

  // ── Cart helpers ──────────────────────────────────────────────────────────

  function selectCustomer(c: Customer) {
    setSelectedUserId(c.id);
    setName(c.name || '');
    setPhone(c.phone || '');
    setShowCustomerDropdown(false);
    setCustomerSearch('');
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [...prev, { product, qty: 1, overridePrice: null }];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== id));
  }

  function setPrice(id: string, price: number) {
    setCart((prev) => prev.map((l) => (l.product.id === id ? { ...l, overridePrice: price } : l)));
  }

  // ── Create order ─────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/orders/admin/create', {
        shippingName: name,
        shippingPhone: phone,
        shippingAddress: address,
        shippingCity: city,
        shippingProvince: province,
        shippingNotes: notes || undefined,
        paymentMethod,
        deliveryFee: delivery,
        ...(selectedUserId ? { userId: selectedUserId } : {}),
        items: cart.map((l) => ({
          productId: l.product.id,
          quantity: l.qty,
          ...(l.overridePrice !== null ? { overridePrice: l.overridePrice } : {}),
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminOrderStats'] });
      toast.success('Order created and sent to Telegram');
      setShowConfirm(false);
      setCart([]);
      setName(''); setPhone(''); setAddress(''); setCity('');
      setProvince(''); setNotes(''); setDeliveryFee('1.50');
      setSelectedUserId('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create order');
      setShowConfirm(false);
    },
  });

  const canSubmit =
    cart.length > 0 && name.trim() && phone.trim() && address.trim() && city.trim() && province;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-gray-900">Online Selling</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create an order manually and send the invoice to the Telegram seller group.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Left: Product Selector ─────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="card p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="input-field w-full pl-9"
              />
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <Package className="h-10 w-10 text-blush-300 mx-auto mb-2" />
                <p>No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
                {products.map((p) => {
                  const inCart = cart.find((l) => l.product.id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="flex items-center gap-3 rounded-2xl border border-blush-100 bg-white p-3 text-left hover:shadow-pink-md transition-all group"
                    >
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-blush-50 shrink-0 relative">
                        {p.images[0] ? (
                          <Image src={p.images[0].url} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-5 w-5 text-blush-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-bold text-primary-500">
                            ${Number(p.price).toFixed(2)}
                          </span>
                          {p.trackStock && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.stock <= 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          inCart
                            ? 'bg-emerald-50 text-emerald-500'
                            : 'bg-blush-100 text-blush-400 group-hover:bg-primary-500 group-hover:text-white'
                        }`}
                      >
                        {inCart ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart + Customer ─────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Cart */}
          <div className="card p-4">
            <h2 className="flex items-center gap-2 font-heading font-extrabold text-gray-900 mb-3">
              <ShoppingCart className="h-4 w-4 text-primary-400" /> Cart ({cart.length})
            </h2>

            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Select products to add them to the order.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {cart.map((l) => (
                  <div key={l.product.id} className="flex items-center gap-2 rounded-xl border border-blush-100 p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{l.product.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {/* Price override */}
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={l.overridePrice ?? Number(l.product.price)}
                            onChange={(e) => setPrice(l.product.id, parseFloat(e.target.value) || 0)}
                            className="input-field w-20 text-xs py-1 pl-5 pr-1"
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">× {l.qty}</span>
                        <span className="text-[11px] font-bold text-gray-900 ml-auto">
                          ${((l.overridePrice ?? Number(l.product.price)) * l.qty).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button onClick={() => changeQty(l.product.id, 1)} className="h-5 w-5 rounded bg-blush-100 flex items-center justify-center hover:bg-blush-200">
                        <Plus className="h-3 w-3 text-gray-600" />
                      </button>
                      <button onClick={() => changeQty(l.product.id, -1)} className="h-5 w-5 rounded bg-blush-100 flex items-center justify-center hover:bg-blush-200">
                        <Minus className="h-3 w-3 text-gray-600" />
                      </button>
                    </div>
                    <button onClick={() => removeLine(l.product.id)} className="shrink-0 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="mt-3 pt-3 border-t border-blush-100 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Subtotal</span>
                <span className="font-bold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Delivery ($)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="input-field w-20 text-xs py-1 text-right"
                />
              </div>
              <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-1 border-t border-blush-100">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="card p-4">
            <h2 className="flex items-center gap-2 font-heading font-extrabold text-gray-900 mb-3">
              <User className="h-4 w-4 text-primary-400" /> Customer
            </h2>

            {/* Existing customer picker */}
            <div className="relative mb-3">
              <button
                type="button"
                onClick={() => setShowCustomerDropdown((s) => !s)}
                className="w-full flex items-center gap-2 rounded-xl border border-dashed border-blush-200 bg-blush-50/50 px-3 py-2 text-xs text-gray-500 hover:bg-blush-100 transition-colors"
              >
                <Users className="h-4 w-4 text-blush-400" />
                <span className="flex-1 text-left truncate">
                  {selectedUserId ? customers.find((c) => c.id === selectedUserId)?.name || 'Selected customer' : 'Pick existing customer (optional)'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </button>

              {showCustomerDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white rounded-2xl border border-blush-100 shadow-pink-lg overflow-hidden">
                  <div className="p-2 relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search customers..."
                      className="input-field w-full pl-8 text-xs"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectCustomer(c)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-blush-50 text-left"
                      >
                        <div className="h-6 w-6 rounded-full bg-blush-100 flex items-center justify-center text-[10px] font-bold text-primary-500 shrink-0">
                          {c.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-700 truncate">{c.name}</p>
                          <p className="text-gray-400 text-[10px] truncate">{c.email} · {c.phone || 'no phone'}</p>
                        </div>
                      </button>
                    ))}
                    {customers.length === 0 && (
                      <p className="px-3 py-4 text-center text-xs text-gray-400">No customers found</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *"
                  className="input-field w-full pl-9" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone *"
                  className="input-field w-full pl-9" />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address *"
                  className="input-field w-full pl-9" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City *"
                  className="input-field w-full" />
                <select value={province} onChange={(e) => setProvince(e.target.value)}
                  className="input-field w-full">
                  <option value="">Province *</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)"
                  className="input-field w-full pl-9" />
              </div>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="input-field w-full">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => canSubmit && setShowConfirm(true)}
              disabled={!canSubmit || createMutation.isPending}
              className="btn-primary w-full mt-4 py-3 flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-40"
            >
              {createMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                <><DollarSign className="h-4 w-4" /> Confirm & Send to Telegram</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ───────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-4xl shadow-pink-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100">
              <h3 className="font-heading font-extrabold text-gray-900">Confirm Order</h3>
              <button onClick={() => setShowConfirm(false)} className="p-2 rounded-full hover:bg-blush-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Items</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {cart.map((l) => (
                    <div key={l.product.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{l.qty} × {l.product.name}</span>
                      <span className="font-bold text-gray-900">
                        ${((l.overridePrice ?? Number(l.product.price)) * l.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-blush-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery</span>
                  <span className="font-bold">${delivery.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-gray-900 pt-1 border-t border-blush-100">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-blush-50 p-3 text-sm text-gray-700 space-y-1">
                <p className="font-bold text-gray-900">{name}</p>
                <p>{phone}</p>
                <p>{address}, {city}, {province}</p>
                <p className="text-gray-500">
                  Payment: {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}
                  {notes && <> · Note: {notes}</>}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                An invoice receipt will be sent to the Telegram group.
              </div>
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-blush-100 bg-blush-50/50">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {createMutation.isPending ? 'Creating...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
