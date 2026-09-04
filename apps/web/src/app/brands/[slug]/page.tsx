'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Loader2, Package, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';

interface BrandProduct {
  id: string;
  name: string;
  slug: string;
  price: string;
  comparePrice: string | null;
  images: { url: string; alt: string | null }[];
  reviews: { rating: number }[];
}

interface BrandData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  products: BrandProduct[];
}

function ProductCard({ product }: { product: BrandProduct }) {
  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
      : 0;

  return (
    <Link href={`/product/${product.slug}`} className="card group block">
      <div className="aspect-square bg-blush-50 flex items-center justify-center overflow-hidden rounded-t-3xl">
        {product.images.length > 0 ? (
          <img
            src={product.images[0].url}
            alt={product.images[0].alt || product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Package className="h-10 w-10 text-primary-200 opacity-60" />
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-bold text-gray-800 group-hover:text-primary-600 transition-colors">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-base font-extrabold text-primary-600">{formatPrice(product.price)}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white shadow-pink-sm group-hover:bg-primary-600 transition-colors">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BrandDetailPage() {
  const { slug } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['brand', slug],
    queryFn: () => api.get(`/brands/${slug}`),
  });

  const brand = data?.data.data.brand as BrandData | undefined;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <section className="py-10 lg:py-14">
          <div className="container-shop">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
              <Link href="/" className="hover:text-primary-500 transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link href="/brands" className="hover:text-primary-500 transition-colors">Brands</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-gray-700 font-semibold capitalize">{String(slug).replace(/-/g, ' ')}</span>
            </nav>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
              </div>
            ) : error || !brand ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Package className="h-12 w-12 text-blush-300 mb-3" />
                <p className="font-heading font-bold text-gray-500 text-lg">Brand not found</p>
                <Link href="/brands" className="mt-4 text-sm font-bold text-primary-500 hover:underline">
                  ← Back to brands
                </Link>
              </div>
            ) : (
              <>
                {/* Brand header */}
                <div className="flex items-center gap-5 mb-8">
                  {brand.logo && (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-blush-50 border border-blush-100">
                      <Image src={brand.logo} alt={brand.name} fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-heading font-extrabold text-gray-900 sm:text-3xl">
                      {brand.name}
                    </h1>
                    {brand.description && (
                      <p className="mt-1 text-sm text-gray-500">{brand.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {brand.products.length} product{brand.products.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Products grid */}
                {brand.products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Package className="h-12 w-12 text-blush-300 mb-3" />
                    <p className="font-heading font-bold text-gray-500 text-lg">No products yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
                    {brand.products.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
