'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Tag, Package } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCartStore } from '@/stores/cartStore';
import api from '@/lib/api';

export default function CartPage() {
  const { items, subtotal, itemCount, fetchCart, updateQuantity, removeItem, isLoading } = useCartStore();
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const shipping = subtotal >= 30 ? 0 : 3;
  const total = subtotal + shipping - discount;

  const applyCoupon = async () => {
    setCouponError('');
    setDiscount(0);
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    try {
      const res = await api.post('/coupons/validate', {
        code: couponCode.trim(),
        cartTotal: subtotal,
      });
      setDiscount(res.data.data.discount);
    } catch (err: any) {
      setCouponError(err?.response?.data?.message || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    try {
      await updateQuantity(itemId, newQty);
    } catch {
      toast.error('Failed to update quantity');
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      await removeItem(itemId);
      toast.success('Item removed from cart');
    } catch {
      toast.error('Failed to remove item');
    }
  };

  if (!isLoading && items.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto" />
            <h1 className="text-2xl font-heading font-bold text-gray-900 mt-4">Your Cart is Empty</h1>
            <p className="text-gray-500 mt-2">Looks like you haven&apos;t added anything yet</p>
            <Link href="/shop" className="mt-6 inline-block btn-primary">Start Shopping</Link>
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
        <div className="container-shop py-8">
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 mb-8">Shopping Cart</h1>

          <div className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
            <div className="space-y-4">
              {isLoading ? (
                [1, 2].map((i) => (
                  <div key={i} className="card p-4 animate-pulse flex gap-4">
                    <div className="w-24 h-24 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-3">
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                      <div className="h-5 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                ))
              ) : (
                items.map((item) => (
                  <div key={item.id} className="card relative flex gap-3 sm:gap-4 p-3 sm:p-4">
                    <Link href={`/product/${item.product.slug}`} className="relative w-16 h-16 sm:w-24 sm:h-24 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {item.product.images.length > 0 ? (
                        <Image src={item.product.images[0].url} alt={item.product.name} fill className="object-cover" unoptimized />
                      ) : (
                        <Package className="h-5 w-5 sm:h-6 sm:w-6 text-gray-300" />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-primary-600 font-medium">{item.product.brand.name}</p>
                          <Link href={`/product/${item.product.slug}`} className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-primary-600">
                            {item.product.name}
                          </Link>
                        </div>
                        <button onClick={() => handleRemove(item.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2 sm:mt-3">
                        <div className="flex items-center border rounded-lg">
                          <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} className="p-2 sm:p-2.5 hover:bg-gray-50 rounded-l-lg"><Minus className="h-3 w-3" /></button>
                          <span className="px-2.5 sm:px-3 text-sm font-medium min-w-[32px] text-center">{item.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} className="p-2 sm:p-2.5 hover:bg-gray-50 rounded-r-lg"><Plus className="h-3 w-3" /></button>
                        </div>
                        <p className="font-bold text-sm sm:text-base text-primary-600">${(parseFloat(item.product.price) * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <Link href="/shop" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600">
                <ArrowLeft className="h-4 w-4" /> Continue Shopping
              </Link>
            </div>

            <div className="lg:sticky lg:top-24 h-fit">
              <div className="card p-4 sm:p-6">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal ({itemCount} items)</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">
                      {shipping === 0 ? <span className="text-green-600">Free</span> : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({couponCode.toUpperCase()})</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="text-primary-600">${total.toFixed(2)}</span>
                  </div>
                </div>

                {subtotal < 30 && subtotal > 0 && (
                  <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                    <p className="text-xs text-primary-700">Add ${(30 - subtotal).toFixed(2)} more for free shipping!</p>
                    <div className="mt-2 bg-primary-200 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (subtotal / 30) * 100)}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Coupon code" className="input-field pl-9 py-2.5 sm:py-3 text-sm" />
                    </div>
                    <button onClick={applyCoupon} disabled={couponLoading}
                      className="btn-secondary text-sm px-3 sm:px-4 disabled:opacity-50 whitespace-nowrap">
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                </div>

                <Link href="/checkout" className="mt-6 block w-full btn-primary text-center py-2.5 sm:py-3 text-sm sm:text-base">
                  Proceed to Checkout
                </Link>
                <p className="text-xs text-gray-400 text-center mt-3">
                  Secure checkout with ABA Pay, Wing, Visa, or Cash on Delivery
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
