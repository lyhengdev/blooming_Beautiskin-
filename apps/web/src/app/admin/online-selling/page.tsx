'use client';

import { useState, useMemo, useRef } from 'react';
import { isAxiosError } from 'axios';
import ScanInput, { ScanCode } from '@/components/barcode/ScanInput';
import { addSaleItem, linePrice, SaleProduct as Product, SaleLine as CartLine, SaleVariant } from '@/lib/saleCart';
import Image from 'next/image';
import {
  Loader2, Search, Plus, Minus, Trash2, X, Package,
  ShoppingCart, User, Phone, MapPin, DollarSign,
  MessageSquare, CheckCircle2, ChevronDown, Users, UserPlus,
  ChevronLeft, ChevronRight,
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
  const [productPage, setProductPage] = useState(1);
  const { data: productsRes, isLoading: loadingProducts } = useQuery({
    queryKey: ['onlineSellingProducts', search, productPage],
    queryFn: () =>
      api.get('/products/admin', {
        params: { page: productPage, limit: 50, isActive: true, search: search || undefined, sort: 'name' },
      }),
  });
  const products: Product[] = productsRes?.data?.data?.products ?? [];
  const productPagination = productsRes?.data?.data?.pagination ?? { page: 1, total: 0, totalPages: 1 };

  // Cart
  const [cart, setCartState] = useState<CartLine[]>([]);
  const cartRef = useRef<CartLine[]>([]);
  function setCart(value: CartLine[] | ((current: CartLine[]) => CartLine[])) {
    const next = typeof value === 'function' ? value(cartRef.current) : value;
    cartRef.current = next;
    setCartState(next);
  }
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [unknownCode, setUnknownCode] = useState<ScanCode | null>(null);
  const [lastAdded, setLastAdded] = useState('');
  const [scanPending, setScanPending] = useState(false);
  const checkoutRequest = useRef<{ key: string; payload: string } | null>(null);
  const saleLocked = useRef(false);
  const cartPanel = useRef<HTMLDivElement>(null);

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
  const [checkoutUncertain, setCheckoutUncertain] = useState(false);

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
    () => cart.reduce((sum, l) => sum + Math.round(linePrice(l) * 100) * l.qty, 0) / 100,
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

  function clearCustomer() {
    setSelectedUserId('');
    setShowCustomerDropdown(false);
    setCustomerSearch('');
    setRegisterOpen(false);
  }

  // Inline "register new customer" used when a scanned/typed phone has no match
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const registerMutation = useMutation({
    mutationFn: (payload: { name: string; phone?: string }) =>
      api.post('/admin/customers', payload),
    onSuccess: (res) => {
      const data = res?.data?.data as { customer?: Customer; alreadyExists?: boolean } | undefined;
      const created = data?.customer;
      if (created) {
        selectCustomer(created);
        toast.success(data?.alreadyExists ? 'Customer already exists — selected' : 'Customer registered');
      }
      setRegisterOpen(false);
      setRegisterName('');
      setRegisterPhone('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to register customer');
    },
  });

  function openRegister(phoneHint?: string) {
    const hint = phoneHint || phone || customerSearch || '';
    setRegisterPhone(hint);
    setRegisterName(name || '');
    setRegisterOpen(true);
  }

  function addToCart(product: Product, variant?: SaleVariant) {
    if (saleLocked.current) return;
    if (product.variants?.length && !variant) { setVariantProduct(product); return; }
    try {
      setCart((current) => addSaleItem(current, product, variant));
      setLastAdded(`${product.id}:${variant?.id || 'base'}`);
    } catch (error) { toast.error((error as Error).message); }
  }

  async function scanProduct(code: ScanCode) {
    if (saleLocked.current) throw new Error('Finish or close checkout before scanning.');
    if (variantProduct) throw new Error('Choose a variant before scanning the next item.');
    setUnknownCode(null);
    try {
      const response = await api.get('/products/admin/barcode-lookup', { params: { code: code.value, format: code.format } });
      if (saleLocked.current) throw new Error('Checkout is open. Scan this item after closing it.');
      const { product, variant } = response.data.data as { product: Product; variant?: SaleVariant };
      if (product.variants?.length && !variant) {
        setVariantProduct(product);
        return `Choose a variant for ${product.name}`;
      }
      setCart((current) => addSaleItem(current, product, variant || undefined));
      const key = `${product.id}:${variant?.id || 'base'}`;
      setLastAdded(key);
      return `Added ${product.name}${variant ? ` (${variant.name})` : ''}, quantity ${cartRef.current.find((line) => line.key === key)!.qty}`;
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 404) setUnknownCode(code);
        throw new Error(error.response?.data?.message || 'Connection failed. Scan again when online.');
      }
      throw error;
    }
  }

  function changeQty(id: string, delta: number) {
    if (saleLocked.current) return;
    const line = cartRef.current.find((item) => item.key === id);
    if (line && delta > 0) { addToCart(line.product, line.variant); return; }
    setCart((prev) =>
      prev
        .map((l) => (l.key === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.key !== id));
  }

  function setPrice(id: string, price: number) {
    setCart((prev) => prev.map((l) => (l.key === id ? { ...l, overridePrice: price } : l)));
  }

  async function refreshPrices() {
    try {
      const updated = await Promise.all(cartRef.current.map(async (line) => {
        const response = await api.get(`/products/admin/${line.product.id}`);
        const product = response.data.data.product as Product;
        const variant = line.variant ? product.variants?.find((item) => item.id === line.variant!.id) : undefined;
        if (line.variant && !variant) throw new Error(`Variant unavailable: ${line.variant.name}`);
        return { ...line, product, variant };
      }));
      if (saleLocked.current) return;
      setCart((current) => current.map((line) => {
        const fresh = updated.find((entry) => entry.key === line.key);
        return fresh ? { ...line, product: fresh.product, variant: fresh.variant } : line;
      }));
      toast.success('Prices and stock refreshed. Review the total before checkout.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to refresh prices'); }
  }

  // ── Create order ─────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
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
          variantId: l.variant?.id,
          quantity: l.qty,
          expectedPrice: Number(l.variant?.price ?? l.product.price),
          ...(l.overridePrice !== null ? { overridePrice: l.overridePrice } : {}),
        })),
      };
      const serialized = JSON.stringify(payload);
      if (!checkoutRequest.current || checkoutRequest.current.payload !== serialized) checkoutRequest.current = { key: crypto.randomUUID(), payload: serialized };
      return api.post('/orders/admin/create', payload, { headers: { 'Idempotency-Key': checkoutRequest.current.key } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminOrderStats'] });
      queryClient.invalidateQueries({ queryKey: ['onlineSellingProducts'] });
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      checkoutRequest.current = null;
      saleLocked.current = false;
      toast.success('Order created');
      setCheckoutUncertain(false);
      setShowConfirm(false);
      setCart([]);
      setName(''); setPhone(''); setAddress(''); setCity('');
      setProvince(''); setNotes(''); setDeliveryFee('1.50');
      setSelectedUserId('');
      setRegisterOpen(false);
      setRegisterName('');
      setRegisterPhone('');
    },
    onError: (err: any) => {
      const uncertain = !err?.response || err.response.status >= 500;
      saleLocked.current = uncertain;
      setCheckoutUncertain(uncertain);
      toast.error(uncertain ? 'Order confirmation was interrupted. Retry this checkout to check the same sale.' : err?.response?.data?.message || 'Failed to create order');
      setShowConfirm(uncertain);
    },
  });

  const canSubmit =
    !scanPending && cart.length > 0 && name.trim() && phone.trim() && address.trim() && city.trim() && province;

  return (
    <div className="pb-24 lg:pb-0">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-gray-900">Online Selling</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Left: Product Selector ─────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="mb-4 space-y-2">
            <ScanInput onScan={scanProduct} onPendingChange={setScanPending} disabled={showConfirm || createMutation.isPending || !!variantProduct} autoFocus />
            {unknownCode && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="mb-2 break-all">Unknown barcode: {unknownCode.value}</p>
              <div className="flex flex-wrap gap-4"><button type="button" onClick={() => { setSearch(unknownCode.value); setProductPage(1); }} className="underline">Search products</button>
              <a className="underline" target="_blank" rel="noreferrer" href={`/admin/products?barcode=${encodeURIComponent(unknownCode.value)}&format=${encodeURIComponent(unknownCode.format || '')}`}>Create product</a></div>
            </div>}
          </div>
          <div className="card p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setProductPage(1); }}
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
                  const availableStock = p.variants?.length ? p.variants.reduce((sum, variant) => sum + variant.stock, 0) : p.stock;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={createMutation.isPending || (p.trackStock && !p.variants?.length && p.stock < 1)}
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
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${availableStock <= 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {availableStock > 0 ? `${availableStock} ${p.variants?.length ? 'across variants' : 'in stock'}` : 'Out of stock'}
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

            {!loadingProducts && products.length > 0 && productPagination.totalPages > 1 && (
              <div className="mt-3 pt-3 border-t border-blush-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Showing {Math.min(50, productPagination.total - (productPagination.page - 1) * 50)} of {productPagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    disabled={productPagination.page <= 1}
                    className="flex items-center gap-1 rounded-full border border-blush-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-blush-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  <span className="text-xs text-gray-500 font-semibold">
                    {productPagination.page} / {productPagination.totalPages}
                  </span>
                  <button
                    onClick={() => setProductPage((p) => Math.min(productPagination.totalPages, p + 1))}
                    disabled={productPagination.page >= productPagination.totalPages}
                    className="flex items-center gap-1 rounded-full border border-blush-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-blush-50 disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Cart + Customer ─────────────────────────────────────── */}
        <div ref={cartPanel} className="lg:col-span-2 space-y-4 scroll-mt-20">
          {/* Cart */}
          <div className="card p-4">
            <h2 className="flex items-center gap-2 font-heading font-extrabold text-gray-900 mb-3">
              <ShoppingCart className="h-4 w-4 text-primary-400" /> Cart ({cart.length})
            </h2>
            {cart.length > 0 && <button type="button" disabled={createMutation.isPending} onClick={refreshPrices} className="mb-3 text-xs font-semibold text-primary-600">Refresh prices and stock</button>}

            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Select products to add them to the order.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {cart.map((l) => (
                  <div key={l.key} className={`flex items-center gap-2 rounded-lg border p-2 ${lastAdded === l.key ? 'border-emerald-300 bg-emerald-50/40' : 'border-blush-100'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{l.product.name}</p>
                      {l.variant && <p className="text-xs text-gray-600">{l.variant.name}</p>}
                      <div className="flex items-center gap-1.5 mt-1">
                        {/* Price override */}
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={linePrice(l)}
                            aria-label={`Price for ${l.product.name} ${l.variant?.name || ''}`}
                            onChange={(e) => setPrice(l.key, parseFloat(e.target.value) || 0)}
                            className="input-field w-20 text-xs py-1 pl-5 pr-1"
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">× {l.qty}</span>
                        <span className="text-[11px] font-bold text-gray-900 ml-auto">
                          ${(linePrice(l) * l.qty).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button aria-label={`Increase ${l.product.name} ${l.variant?.name || ''}`} onClick={() => changeQty(l.key, 1)} className="h-8 w-8 rounded bg-blush-100 flex items-center justify-center hover:bg-blush-200">
                        <Plus className="h-3 w-3 text-gray-600" />
                      </button>
                      <button aria-label={`Decrease ${l.product.name} ${l.variant?.name || ''}`} onClick={() => changeQty(l.key, -1)} className="h-8 w-8 rounded bg-blush-100 flex items-center justify-center hover:bg-blush-200">
                        <Minus className="h-3 w-3 text-gray-600" />
                      </button>
                    </div>
                    <button aria-label={`Remove ${l.product.name} ${l.variant?.name || ''}`} onClick={() => removeLine(l.key)} className="shrink-0 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500">
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
                className={`w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
                  selectedUserId
                    ? 'border-emerald-200 bg-emerald-50/50 text-gray-700 hover:bg-emerald-50'
                    : 'border-dashed border-blush-200 bg-blush-50/50 text-gray-500 hover:bg-blush-100'
                }`}
              >
                {selectedUserId ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Users className="h-4 w-4 text-blush-400" />
                )}
                <span className="flex-1 text-left truncate">
                  {selectedUserId
                    ? customers.find((c) => c.id === selectedUserId)?.name || 'Selected customer'
                    : 'Walk-in · no account linked'}
                </span>
                {selectedUserId && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); clearCustomer(); }}
                    className="shrink-0 p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500"
                    title="Clear selection"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </button>

              {showCustomerDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white rounded-2xl border border-blush-100 shadow-pink-lg overflow-hidden">
                  <div className="p-2 relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search phone, name, email...  (scan a number)"
                      className="input-field w-full pl-8 text-xs"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {/* Walk-in row */}
                    <button
                      onClick={clearCustomer}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-blush-50 text-left"
                    >
                      <div className="h-6 w-6 rounded-full bg-blush-100 flex items-center justify-center shrink-0">
                        <Users className="h-3 w-3 text-blush-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-700 truncate">Walk-in · no account</p>
                        <p className="text-gray-400 text-[10px] truncate">Just fill the customer info below</p>
                      </div>
                    </button>

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

                    {customers.length === 0 && customerSearch ? (
                      <>
                        <p className="px-3 pt-3 text-center text-xs text-gray-400">
                          No customer with “{customerSearch}” found
                        </p>
                        {!registerOpen ? (
                          <button
                            onClick={() => openRegister(customerSearch)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-primary-500 hover:bg-primary-50 border-t border-blush-50 mt-2"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Register “{customerSearch}” as new customer
                          </button>
                        ) : (
                          <div className="p-3 space-y-2 border-t border-blush-50">
                            <input
                              value={registerName}
                              onChange={(e) => setRegisterName(e.target.value)}
                              placeholder="Full name *"
                              className="input-field w-full text-xs"
                            />
                            <input
                              value={registerPhone}
                              onChange={(e) => setRegisterPhone(e.target.value)}
                              placeholder="Phone"
                              className="input-field w-full text-xs"
                            />
                            <button
                              onClick={() => registerMutation.mutate({ name: registerName, phone: registerPhone || undefined })}
                              disabled={!registerName.trim() || registerMutation.isPending}
                              className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                            >
                              {registerMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                              Register customer
                            </button>
                          </div>
                        )}
                      </>
                    ) : customers.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-gray-400">
                        No customers yet — search a phone number to register one
                      </p>
                    ) : null}
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
              onClick={() => { if (canSubmit) { saleLocked.current = true; setShowConfirm(true); } }}
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
      {variantProduct && <div role="dialog" aria-modal="true" aria-label="Choose variant" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-bold">{variantProduct.name}</h2><button autoFocus type="button" onClick={() => setVariantProduct(null)} aria-label="Close variant selection" className="p-2"><X className="h-5 w-5" /></button></div>
          <div className="max-h-80 space-y-2 overflow-auto">{variantProduct.variants?.map((variant) => <button key={variant.id} type="button" disabled={variantProduct.trackStock && variant.stock < 1} onClick={() => { addToCart(variantProduct, variant); setVariantProduct(null); }} className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm disabled:opacity-40">
            <span>{variant.name}<span className="block text-xs text-gray-500">{variantProduct.trackStock ? `${variant.stock} in stock` : ''}</span></span><span className="font-semibold">${Number(variant.price).toFixed(2)}</span>
          </button>)}</div>
        </div>
      </div>}
      {cart.length > 0 && <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t bg-white px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
        <div className="text-sm"><span className="font-bold">${total.toFixed(2)}</span><span className="ml-2 text-gray-500">{cart.reduce((sum, line) => sum + line.qty, 0)} items</span></div>
        <button type="button" onClick={() => cartPanel.current?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white"><ShoppingCart className="h-4 w-4" />Review sale</button>
      </div>}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-4xl shadow-pink-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100">
              <h3 className="font-heading font-extrabold text-gray-900">Confirm Order</h3>
              <button disabled={createMutation.isPending || checkoutUncertain} onClick={() => { saleLocked.current = false; setShowConfirm(false); }} className="p-2 rounded-full hover:bg-blush-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {checkoutUncertain && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Confirmation interrupted. Retry to retrieve or complete this same sale.</p>}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Items</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {cart.map((l) => (
                    <div key={l.key} className="flex justify-between gap-3 text-sm">
                      <span className="text-gray-600">{l.qty} × {l.product.name} {l.variant?.name}</span>
                      <span className="font-bold text-gray-900">
                        ${(linePrice(l) * l.qty).toFixed(2)}
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
              <button disabled={createMutation.isPending || checkoutUncertain} onClick={() => { saleLocked.current = false; setShowConfirm(false); }} className="btn-secondary flex-1 py-2.5 text-sm">
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
