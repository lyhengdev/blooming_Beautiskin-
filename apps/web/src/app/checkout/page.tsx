'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Check, Package, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

const PROVINCES = [
  'Phnom Penh', 'Battambang', 'Siem Reap', 'Sihanoukville', 'Kampot',
  'Kandal', 'Prey Veng', 'Kampong Cham', 'Kampong Speu', 'Koh Kong',
];

const FREE_SHIPPING_THRESHOLD = 30;

function getDeliveryFee(subtotal: number, province: string): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return province === 'Phnom Penh' ? 1 : 1.5;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, subtotal, itemCount, fetchCart, clearCart } = useCartStore();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH_ON_DELIVERY');
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '',
    address: '', province: '', city: '',
    notes: '',
  });

  useEffect(() => {
    fetchCart();
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
      }));
    }
  }, [fetchCart, user]);

  const shipping = getDeliveryFee(subtotal, formData.province);
  const total = subtotal + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.info('Please login to checkout', {
        action: { label: 'Login', onClick: () => router.push('/login?returnTo=/checkout') },
      });
      return;
    }

    if (step === 1) {
      setStep(2);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/orders', {
        shippingName: formData.name,
        shippingPhone: formData.phone,
        shippingAddress: formData.address,
        shippingCity: formData.city,
        shippingProvince: formData.province,
        shippingNotes: formData.notes,
        paymentMethod,
      });
      const orderNum = res.data.data.order.orderNumber;
      await clearCart();
      toast.success('Order placed successfully!');
      router.push(`/confirmation?order=${orderNum}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !submitting) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16 sm:py-20 px-4">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold">Your cart is empty</h1>
            <Link href="/shop" className="mt-4 inline-block btn-primary">Shop Now</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="container-shop py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 mb-6 sm:mb-8">Checkout</h1>

          {!user && (
            <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-primary-50 rounded-xl border border-primary-100">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">You need to log in to checkout</p>
                  <p className="text-sm text-gray-600">Login for faster checkout and order tracking.</p>
                </div>
                <Link href="/login?returnTo=/checkout" className="btn-primary text-sm flex items-center gap-1">
                  <LogIn className="h-4 w-4" /> Login
                </Link>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
            {[{ num: 1, label: 'Shipping' }, { num: 2, label: 'Review' }].map(({ num, label }) => (
              <div key={num} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-colors ${step >= num ? 'bg-primary-600 text-white shadow-pink-sm' : 'bg-gray-200 text-gray-500'}`}>
                    {step > num ? <Check className="h-4 w-4" /> : num}
                  </div>
                  <span className={`text-[11px] sm:text-xs font-semibold ${step >= num ? 'text-primary-600' : 'text-gray-400'}`}>{label}</span>
                </div>
                {num < 2 && <div className={`w-12 sm:w-20 h-0.5 rounded-full transition-colors mb-5 ${step > num ? 'bg-primary-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
              <div>
                {step === 1 && (
                  <div className="card p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold mb-4">Shipping Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input type="text" required className="input-field" value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input type="tel" required className="input-field" placeholder="+855" value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" className="input-field" value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input type="text" required className="input-field" value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                        <select required className="input-field truncate" value={formData.province}
                          onChange={(e) => setFormData({ ...formData, province: e.target.value })}>
                          <option value="">Select province</option>
                          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City/District</label>
                        <input type="text" required className="input-field" value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Notes (optional)</label>
                        <textarea className="input-field" rows={2} value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="card p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold mb-4">Review Order</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">Shipping to</p>
                          <p className="text-gray-500">{formData.name}</p>
                          <p className="text-gray-500 break-words">{formData.address}, {formData.city}, {formData.province}</p>
                          <p className="text-gray-500">{formData.phone}</p>
                        </div>
                        <button type="button" onClick={() => setStep(1)} className="text-primary-600 text-sm">Edit</button>
                      </div>
                      <div className="border-t pt-4">
                        <p className="font-medium mb-2">Items ({itemCount})</p>
                        {items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm py-1 gap-2">
                            <span className="truncate min-w-0">{item.product.name} x{item.quantity}</span>
                            <span className="shrink-0">${(parseFloat(item.product.price) * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-4">
                        <p className="font-medium mb-2">Payment Method</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { value: 'CASH_ON_DELIVERY', label: 'Cash on Delivery' },
                            { value: 'ABA_PAY', label: 'ABA Pay' },
                            { value: 'WING', label: 'Wing Money' },
                            { value: 'CREDIT_CARD', label: 'Credit / Debit Card' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setPaymentMethod(opt.value)}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                                paymentMethod === opt.value
                                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300'
                              }`}
                            >
                              <span className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${
                                paymentMethod === opt.value ? 'border-primary-600' : 'border-gray-300'
                              }`}>
                                {paymentMethod === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-primary-600" />}
                              </span>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary text-sm sm:text-base">Back</button>}
                  <button type="submit" disabled={submitting}
                    className="btn-primary flex-1 text-sm sm:text-base disabled:opacity-50">
                    {submitting ? 'Placing Order...' : step === 2 ? 'Place Order' : 'Continue'}
                  </button>
                </div>
              </div>

              <div className="lg:sticky lg:top-24 h-fit">
                <div className="card p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold mb-4">Order Summary</h2>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-2 sm:gap-3 items-center">
                        <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.product.images.length > 0 ? (
                            <Image src={item.product.images[0].url} alt="" fill className="object-cover" unoptimized />
                          ) : <Package className="h-4 w-4 text-gray-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">{item.product.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-xs sm:text-sm font-medium shrink-0">${(parseFloat(item.product.price) * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-4 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Delivery</span><span className="text-green-600">{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span></div>
                    <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span className="text-primary-600">${total.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
