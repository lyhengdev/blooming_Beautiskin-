import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your order securely with ABA Pay, Wing, Visa, or Cash on Delivery.',
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
