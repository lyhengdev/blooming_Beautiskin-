'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Package, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';

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
              <EmptyState
                icon={Package}
                title="Brand not found"
                message="The brand may be unavailable or the link may have changed."
                actionHref="/brands"
                actionLabel="Back to brands"
              />
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
                  <EmptyState
                    title="No products yet"
                    message="This brand does not have active products in the shop right now."
                    actionHref="/shop"
                    actionLabel="Browse all products"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
                    {brand.products.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={{
                          ...p,
                          brand: { name: brand.name, slug: brand.slug },
                          avgRating: p.reviews.length > 0
                            ? p.reviews.reduce((sum, review) => sum + review.rating, 0) / p.reviews.length
                            : 0,
                          reviewCount: p.reviews.length,
                        }}
                        showDescription={false}
                      />
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
