'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import api from '@/lib/api';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  _count: { products: number };
}

export default function BrandsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get('/brands'),
  });

  const brands: Brand[] = data?.data.data.brands ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <section className="py-10 lg:py-14">
          <div className="container-shop">
            <div className="mb-8">
              <h1 className="text-2xl font-heading font-extrabold text-gray-900 sm:text-3xl">
                Our Brands
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Authentic Korean &amp; Japanese skincare brands, curated for Cambodia.
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
              </div>
            ) : brands.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Package className="h-12 w-12 text-blush-300 mb-3" />
                <p className="font-heading font-bold text-gray-500 text-lg">No brands found</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {brands.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/brands/${brand.slug}`}
                    className="group flex items-start gap-4 rounded-3xl border border-blush-100 bg-white p-6
                               shadow-pink-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-pink-md"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-blush-50 border border-blush-100">
                      {brand.logo ? (
                        <Image src={brand.logo} alt={brand.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl font-extrabold text-primary-400">
                          {brand.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-heading font-extrabold text-gray-800 group-hover:text-primary-600 transition-colors">
                        {brand.name}
                      </h2>
                      {brand.description && (
                        <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">
                          {brand.description}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] font-semibold text-primary-500">
                        {brand._count.products} product{brand._count.products !== 1 ? 's' : ''} →
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
