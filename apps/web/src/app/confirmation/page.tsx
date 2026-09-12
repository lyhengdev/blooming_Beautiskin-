'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Check, Copy, ShoppingBag, Package, Landmark, Wallet, Truck } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');
  const paymentMethod = searchParams.get('payment');

  const paymentNotice =
    paymentMethod === 'ABA_PAY'
      ? { icon: Landmark, title: 'Pay with ABA Pay', text: 'We will contact you with our ABA payment details. Please complete your transfer to confirm your order.' }
      : paymentMethod === 'WING'
        ? { icon: Wallet, title: 'Pay with Wing Money', text: 'We will contact you with our Wing payment details. Please complete your transfer to confirm your order.' }
        : null;

  const handleCopyOrder = () => {
    if (orderNumber) {
      navigator.clipboard.writeText(orderNumber);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center py-20">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 mt-6">Thank You!</h1>
          <p className="text-gray-500 mt-3">Your order has been placed successfully. We&apos;ll send you a confirmation shortly.</p>

          {orderNumber && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Order Number</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <p className="text-lg font-bold text-primary-600">{orderNumber}</p>
                <button onClick={handleCopyOrder} className="p-1 text-gray-400 hover:text-primary-600" title="Copy">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {paymentNotice && (
              <div className="p-4 bg-primary-50 rounded-lg text-left">
                <div className="flex items-center gap-2 text-primary-700 font-semibold text-sm">
                  <paymentNotice.icon className="h-5 w-5" />
                  {paymentNotice.title}
                </div>
                <p className="text-sm text-gray-600 mt-1">{paymentNotice.text}</p>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-gray-600 justify-center">
              <Package className="h-5 w-5 text-primary-600" />
              <span>Estimated delivery: 3-5 business days</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
            <Link href="/shop" className="btn-primary flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Continue Shopping
            </Link>
            <Link href="/track" className="btn-secondary flex items-center gap-2">
              <Truck className="h-4 w-4" /> Track Your Order
            </Link>
            <Link href="/dashboard?tab=orders" className="btn-secondary">View Orders</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="animate-pulse text-center">
            <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto" />
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mt-6" />
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto mt-4" />
          </div>
        </main>
        <Footer />
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
