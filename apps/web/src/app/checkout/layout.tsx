import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your order securely with Cash on Delivery, ABA Pay, or Wing Money.',
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
