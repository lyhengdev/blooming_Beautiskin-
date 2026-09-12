'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Package, Truck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import api from '@/lib/api';

interface TrackedOrder {
  orderNumber: string;
  status: string;
  createdAt: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  subtotal: string;
  shippingCost: string;
  total: string;
  payment: { method: string; status: string } | null;
  items: {
    quantity: number;
    price: string;
    product: { name: string; slug: string; images: { url: string }[] };
  }[];
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    SHIPPING: 'bg-indigo-100 text-indigo-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-red-100 text-red-700',
  };
  return `inline-block px-2 py-1 text-xs rounded-full font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`;
}

function stepLabels(): { key: string; label: string; icon: typeof Clock }[] {
  return [
    { key: 'PENDING', label: 'Order placed', icon: Clock },
    { key: 'PROCESSING', label: 'Processing', icon: Package },
    { key: 'SHIPPING', label: 'Shipping', icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
  ];
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOrder(null);
    setLoading(true);
    try {
      const res = await api.post('/orders/track', { orderNumber, phone });
      setOrder(res.data.data.order);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to find your order');
    } finally {
      setLoading(false);
    }
  };

  const steps = stepLabels();
  const statusIndex = order
    ? steps.findIndex((s) => order.status === s.key || (order.status === 'CONFIRMED' && s.key === 'PROCESSING'))
    : -1;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="container-shop py-6 sm:py-10 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 mb-2">Track Your Order</h1>
          <p className="text-gray-500 mb-6 text-sm sm:text-base">
            Enter your order number and the phone number you ordered with to check your order status.
          </p>

          <form onSubmit={handleTrack} className="card p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="BBS-20260901-XXXXXXXX"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  className="input-field"
                  placeholder="+855"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="mt-5 btn-primary flex items-center gap-2">
              <Search className="h-4 w-4" />
              {loading ? 'Checking...' : 'Track Order'}
            </button>
            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
          </form>

          {order && (
            <div className="mt-6 space-y-4">
              <div className="card p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="font-bold text-primary-600">{order.orderNumber}</p>
                  <span className={statusBadge(order.status)}>
                    {order.status === 'CONFIRMED' ? 'PROCESSING' : order.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Ordered {new Date(order.createdAt).toLocaleDateString()} &middot; {order.items.length} items &middot; ${Number(order.total).toFixed(2)}
                </p>

                <div className="flex items-center justify-between">
                  {steps.map((s, i) => {
                    const complete = order.status === 'CANCELLED' || order.status === 'REFUNDED'
                      ? false
                      : i <= statusIndex;
                    const cancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';
                    return (
                      <div key={s.key} className="flex-1 text-center relative">
                        <div
                          className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center transition-colors ${
                            cancelled ? 'bg-red-100 text-red-500' : complete ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          {cancelled ? <XCircle className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                        </div>
                        <p className={`text-[10px] sm:text-xs mt-1 font-medium ${complete || cancelled ? 'text-gray-800' : 'text-gray-400'}`}>{s.label}</p>
                        {i < steps.length - 1 && (
                          <div className={`absolute top-4 left-[calc(50%+16px)] right-[calc(-50%+16px)] h-0.5 ${complete ? 'bg-primary-600' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card p-4 sm:p-6">
                <h2 className="text-sm font-semibold mb-3">Items</h2>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {item.product.images?.[0] ? (
                        <Image src={item.product.images[0].url} alt={item.product.name} width={48} height={48} className="rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg" />
                      )}
                      <div className="flex-1 min-w-0">
                        <Link href={`/product/${item.product.slug}`} className="text-sm font-medium text-gray-800 hover:text-primary-600 truncate block">
                          {item.product.name}
                        </Link>
                        <p className="text-xs text-gray-500">Qty {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold">${(Number(item.price) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-4 pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span><span>{Number(order.shippingCost) === 0 ? 'Free' : `$${Number(order.shippingCost).toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Total</span><span>${Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="card p-4 sm:p-6">
                <h2 className="text-sm font-semibold mb-2">Shipping To</h2>
                <p className="text-sm text-gray-600">{order.shippingName} &middot; {order.shippingPhone}</p>
                <p className="text-sm text-gray-600">{order.shippingAddress}, {order.shippingCity}, {order.shippingProvince}</p>
                {order.payment && (
                  <p className="text-sm text-gray-600 mt-2">
                    Payment: {order.payment.method.replace(/_/g, ' ')} &middot; {order.payment.status}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}