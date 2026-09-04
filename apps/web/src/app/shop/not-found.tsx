import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Search } from 'lucide-react';

export default function ShopNotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blush-100 mx-auto mb-5">
            <Search className="h-8 w-8 text-primary-400" />
          </div>
          <p className="text-5xl font-heading font-extrabold text-primary-500">404</p>
          <h1 className="text-xl font-heading font-extrabold text-gray-900 mt-3">Product not found</h1>
          <p className="text-sm text-gray-500 mt-2">
            We couldn&rsquo;t find what you&rsquo;re looking for. It may have been removed or the link might be incorrect.
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <Link href="/shop" className="btn-primary px-5 py-2.5 text-sm">Browse Shop</Link>
            <Link href="/" className="btn-secondary px-5 py-2.5 text-sm">Go Home</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
