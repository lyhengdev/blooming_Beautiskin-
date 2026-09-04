'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X, Grid3X3, LayoutList, Package } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import api from '@/lib/api';

interface Product {
  id: string;
  name: string;
  slug: string;
  shortDesc: string | null;
  price: string;
  comparePrice: string | null;
  brand: { name: string; slug: string };
  category: { name: string; slug: string };
  images: { url: string; alt: string | null }[];
  avgRating: number;
  reviewCount: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

function ShopContent() {
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categoryParam = searchParams.get('category') || '';
  const brandParam = searchParams.get('brand') || '';
  const skinTypeParam = searchParams.get('skinType') || '';
  const searchQuery = searchParams.get('search') || '';

  const { data: productsData, isLoading: loading } = useQuery({
    queryKey: ['products', { category: categoryParam, brand: brandParam, skinType: skinTypeParam, search: searchQuery, page: currentPage }],
    queryFn: () => api.get('/products', { params: { category: categoryParam, brand: brandParam, skinType: skinTypeParam, search: searchQuery, page: currentPage, limit: 12 } }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get('/brands'),
  });

  const products: Product[] = productsData?.data.data.products ?? [];
  const totalPages: number = productsData?.data.data.pagination.totalPages ?? 1;
  const categories: Category[] = categoriesData?.data.data.categories ?? [];
  const brands: Brand[] = brandsData?.data.data.brands ?? [];

  const activeFilters = [categoryParam, brandParam, skinTypeParam].filter(Boolean);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-gray-50 py-8">
          <div className="container-shop">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900">
              {searchQuery ? `Search: "${searchQuery}"` : categoryParam ? `${categoryParam} Products` : 'All Products'}
            </h1>
            <p className="mt-2 text-gray-500">
              {loading ? 'Loading...' : `${products.length} products found`}
            </p>
          </div>
        </div>

        <div className="container-shop py-8">
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
            {/* Sidebar Filters - Desktop */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <Link key={cat.id}
                        href={`/shop?category=${cat.slug}`}
                        className={`block text-sm py-1 ${categoryParam === cat.slug ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>
                        {cat.name} ({cat._count.products})
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Brands</h3>
                  <div className="space-y-2">
                    {brands.map((brand) => (
                      <Link key={brand.id}
                        href={`/shop?brand=${brand.slug}`}
                        className={`block text-sm py-1 ${brandParam === brand.slug ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>
                        {brand.name} ({brand._count.products})
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Skin Type</h3>
                  <div className="space-y-2">
                    {['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'].map((type) => (
                      <Link key={type}
                        href={`/shop?skinType=${type.toLowerCase()}`}
                        className={`block text-sm py-1 ${skinTypeParam === type.toLowerCase() ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>
                        {type}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowFilters(true)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2 border rounded-lg text-sm">
                    <SlidersHorizontal className="h-4 w-4" /> Filters
                  </button>
                  {activeFilters.length > 0 && (
                    <div className="hidden sm:flex items-center gap-2">
                      {activeFilters.map((f) => (
                        <span key={f} className="flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs">
                          {f}
                          <Link href={`/shop?${new URLSearchParams(
                            Object.fromEntries(
                              Array.from(searchParams.entries()).filter(([k, v]) => v !== f)
                            )
                          ).toString()}`}>
                            <X className="h-3 w-3" />
                          </Link>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setViewMode('grid')}
                    className={`p-2 rounded min-w-[44px] min-h-[44px] flex items-center justify-center ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}>
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setViewMode('list')}
                    className={`p-2 rounded min-w-[44px] min-h-[44px] flex items-center justify-center ${viewMode === 'list' ? 'bg-gray-100' : ''}`}>
                    <LayoutList className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Product Grid */}
              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="card animate-pulse">
                      <div className="aspect-square bg-gray-200" />
                      <div className="p-4 space-y-3">
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                        <div className="h-5 bg-gray-200 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-gray-500 text-lg">No products found</p>
                  <Link href="/shop" className="mt-4 inline-block btn-primary">View All Products</Link>
                </div>
              ) : (
                <div className={viewMode === 'grid'
                  ? 'grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6'
                  : 'space-y-4'
                }>
                  {products.map((product) => (
                    <Link key={product.id}
                      href={`/product/${product.slug}`}
                      className={`card group ${viewMode === 'list' ? 'flex' : ''}`}>
                      <div className={`relative ${viewMode === 'list' ? 'w-40 flex-shrink-0' : 'aspect-square'} bg-gray-100 flex items-center justify-center`}>
                        {product.images.length > 0 ? (
                          <Image src={product.images[0].url} alt={product.images[0].alt || product.name}
                            fill className="object-cover" unoptimized />
                        ) : (
                          <Package className="h-10 w-10 text-gray-300" />
                        )}
                      </div>
                      <div className="p-4 flex-1">
                        <p className="text-xs text-primary-600 font-medium">{product.brand.name}</p>
                        <h3 className="text-sm font-medium text-gray-900 mt-1 group-hover:text-primary-600 transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s} className={`text-xs ${s <= product.avgRating ? 'text-yellow-400' : 'text-gray-300'}`}>
                              &#9733;
                            </span>
                          ))}
                          <span className="text-xs text-gray-400 ml-1">({product.reviewCount})</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-lg font-bold text-primary-600">${product.price}</p>
                          {product.comparePrice && (
                            <p className="text-sm text-gray-400 line-through">${product.comparePrice}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${page === currentPage ? 'bg-primary-600 text-white' : 'bg-white border hover:bg-gray-50'}`}>
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Filter Panel */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-80 bg-white shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button onClick={() => setShowFilters(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Categories</h3>
                {categories.map((cat) => (
                  <Link key={cat.id} href={`/shop?category=${cat.slug}`}
                    onClick={() => setShowFilters(false)}
                    className={`block text-sm py-2 ${categoryParam === cat.slug ? 'text-primary-600 font-medium' : 'text-gray-600'}`}>
                    {cat.name}
                  </Link>
                ))}
              </div>
              <div>
                <h3 className="font-semibold mb-3">Brands</h3>
                {brands.map((brand) => (
                  <Link key={brand.id} href={`/shop?brand=${brand.slug}`}
                    onClick={() => setShowFilters(false)}
                    className={`block text-sm py-2 ${brandParam === brand.slug ? 'text-primary-600 font-medium' : 'text-gray-600'}`}>
                    {brand.name}
                  </Link>
                ))}
              </div>
              <div>
                <h3 className="font-semibold mb-3">Skin Type</h3>
                {['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'].map((type) => (
                  <Link key={type} href={`/shop?skinType=${type.toLowerCase()}`}
                    onClick={() => setShowFilters(false)}
                    className={`block text-sm py-2 ${skinTypeParam === type.toLowerCase() ? 'text-primary-600 font-medium' : 'text-gray-600'}`}>
                    {type}
                  </Link>
                ))}
              </div>
              <Link href="/shop" onClick={() => setShowFilters(false)}
                className="block w-full text-center py-2 text-sm text-gray-500 hover:text-gray-700">
                Clear All Filters
              </Link>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>}>
      <ShopContent />
    </Suspense>
  );
}
