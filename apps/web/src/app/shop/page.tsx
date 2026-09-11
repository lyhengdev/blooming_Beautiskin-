'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, X, Grid3X3, LayoutList, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
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
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  const categoryParam = searchParams.get('category') || '';
  const brandParam = searchParams.get('brand') || '';
  const skinTypeParam = searchParams.get('skinType') || '';
  const searchQuery = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'popular';
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';

  useEffect(() => {
    setMinPrice(minPriceParam);
    setMaxPrice(maxPriceParam);
    setCurrentPage(1);
  }, [categoryParam, brandParam, skinTypeParam, searchQuery, sortParam, minPriceParam, maxPriceParam]);

  const { data: productsData, isLoading: loading, isError } = useQuery({
    queryKey: ['products', {
      category: categoryParam,
      brand: brandParam,
      skinType: skinTypeParam,
      search: searchQuery,
      sort: sortParam,
      minPrice: minPriceParam,
      maxPrice: maxPriceParam,
      page: currentPage,
    }],
    queryFn: () => api.get('/products', {
      params: {
        category: categoryParam,
        brand: brandParam,
        skinType: skinTypeParam,
        search: searchQuery,
        sort: sortParam,
        minPrice: minPriceParam,
        maxPrice: maxPriceParam,
        page: currentPage,
        limit: 12,
      },
    }),
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
  const totalProducts: number = productsData?.data.data.pagination.total ?? products.length;
  const categories: Category[] = categoriesData?.data.data.categories ?? [];
  const brands: Brand[] = brandsData?.data.data.brands ?? [];

  const getCategoryLabel = (slug: string) => categories.find((cat) => cat.slug === slug)?.name ?? slug;
  const getBrandLabel = (slug: string) => brands.find((brand) => brand.slug === slug)?.name ?? slug;
  const getSkinTypeLabel = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

  const activeFilters = [
    categoryParam && { key: 'category', value: categoryParam, label: getCategoryLabel(categoryParam) },
    brandParam && { key: 'brand', value: brandParam, label: getBrandLabel(brandParam) },
    skinTypeParam && { key: 'skinType', value: skinTypeParam, label: `${getSkinTypeLabel(skinTypeParam)} skin` },
    minPriceParam && { key: 'minPrice', value: minPriceParam, label: `From $${minPriceParam}` },
    maxPriceParam && { key: 'maxPrice', value: maxPriceParam, label: `Under $${maxPriceParam}` },
  ].filter(Boolean) as { key: string; value: string; label: string }[];

  const SORT_OPTIONS = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
  ];

  const setSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'popular' || value === '') params.delete('sort');
    else params.set('sort', value);
    router.push(`/shop?${params.toString()}`);
    setCurrentPage(1);
  };

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/shop?${params.toString()}`);
    setShowFilters(false);
    setCurrentPage(1);
  };

  const clearFilter = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    router.push(`/shop?${params.toString()}`);
    setCurrentPage(1);
  };

  const applyPriceFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice.trim()) params.set('minPrice', minPrice.trim());
    else params.delete('minPrice');
    if (maxPrice.trim()) params.set('maxPrice', maxPrice.trim());
    else params.delete('maxPrice');
    router.push(`/shop?${params.toString()}`);
    setShowFilters(false);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-gray-50 py-8">
          <div className="container-shop">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900">
              {searchQuery ? `Search: "${searchQuery}"` : categoryParam ? `${getCategoryLabel(categoryParam)} Products` : 'All Products'}
            </h1>
            <p className="mt-2 text-gray-500">
              {loading ? 'Loading...' : `${totalProducts} product${totalProducts !== 1 ? 's' : ''} found`}
            </p>
          </div>
        </div>

        <div className="container-shop py-8">
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
            {/* Sidebar Filters - Desktop */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Filters</h3>
                  {activeFilters.length > 0 && (
                    <Link href="/shop" className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline">
                      Clear all
                    </Link>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <button key={cat.id}
                        type="button"
                        onClick={() => setFilter('category', cat.slug)}
                        className={`block w-full text-left text-sm py-1 ${categoryParam === cat.slug ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>
                        {cat.name} ({cat._count.products})
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Brands</h3>
                  <div className="space-y-2">
                    {brands.map((brand) => (
                      <button key={brand.id}
                        type="button"
                        onClick={() => setFilter('brand', brand.slug)}
                        className={`block w-full text-left text-sm py-1 ${brandParam === brand.slug ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>
                        {brand.name} ({brand._count.products})
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Skin Type</h3>
                  <div className="space-y-2">
                    {['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'].map((type) => (
                      <button key={type}
                        type="button"
                        onClick={() => setFilter('skinType', type.toLowerCase())}
                        className={`block w-full text-left text-sm py-1 ${skinTypeParam === type.toLowerCase() ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-primary-600'}`}>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={applyPriceFilter}>
                  <h3 className="font-semibold text-gray-900 mb-3">Price Range</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min"
                      className="input-field px-3 py-2"
                    />
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max"
                      className="input-field px-3 py-2"
                    />
                  </div>
                  <button type="submit" className="mt-3 w-full btn-secondary py-2">
                    Apply Price
                  </button>
                </form>
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
                    <div className="flex flex-wrap items-center gap-2">
                    {activeFilters.map((filter) => (
                        <span key={filter.key} className="flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs">
                          {filter.label}
                          <button type="button" onClick={() => clearFilter(filter.key)} aria-label={`Remove ${filter.label} filter`}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <select
                      value={sortParam}
                      onChange={(e) => setSort(e.target.value)}
                      aria-label="Sort products"
                      className="pl-9 pr-8 py-2 rounded-lg border border-blush-200 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
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
              ) : isError ? (
                <ErrorState
                  title="Products could not load"
                  message="Check the API connection and try again. Your selected filters are still saved."
                  actionLabel="Retry"
                  onAction={() => window.location.reload()}
                />
              ) : products.length === 0 ? (
                <EmptyState
                  title="No products match these filters"
                  message="Try removing a filter or browsing all skincare products."
                  actionHref="/shop"
                  actionLabel="View All Products"
                />
              ) : (
                <div className={viewMode === 'grid'
                  ? 'grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6'
                  : 'space-y-4'
                }>
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      view={viewMode}
                      showRating
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <>
                  {/* Mobile: compact prev/next */}
                  <div className="flex items-center justify-center gap-3 mt-10 lg:hidden">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="flex items-center gap-1 px-4 py-2.5 rounded-lg border text-sm font-medium disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </button>
                    <span className="text-sm text-gray-600 font-medium">
                      Page {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="flex items-center gap-1 px-4 py-2.5 rounded-lg border text-sm font-medium disabled:opacity-40"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Desktop: full pagination */}
                  <div className="hidden lg:flex justify-center gap-2 mt-10">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${page === currentPage ? 'bg-primary-600 text-white' : 'bg-white border hover:bg-gray-50'}`}>
                        {page}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Filter Panel */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-80 bg-white shadow-xl p-6 overflow-y-auto animate-slide-right">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button onClick={() => setShowFilters(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Categories</h3>
                {categories.map((cat) => (
                  <button key={cat.id}
                    type="button"
                    onClick={() => setFilter('category', cat.slug)}
                    className={`block w-full text-left text-sm py-2 ${categoryParam === cat.slug ? 'text-primary-600 font-medium' : 'text-gray-600'}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
              <div>
                <h3 className="font-semibold mb-3">Brands</h3>
                {brands.map((brand) => (
                  <button key={brand.id}
                    type="button"
                    onClick={() => setFilter('brand', brand.slug)}
                    className={`block w-full text-left text-sm py-2 ${brandParam === brand.slug ? 'text-primary-600 font-medium' : 'text-gray-600'}`}>
                    {brand.name}
                  </button>
                ))}
              </div>
              <div>
                <h3 className="font-semibold mb-3">Skin Type</h3>
                {['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'].map((type) => (
                  <button key={type}
                    type="button"
                    onClick={() => setFilter('skinType', type.toLowerCase())}
                    className={`block w-full text-left text-sm py-2 ${skinTypeParam === type.toLowerCase() ? 'text-primary-600 font-medium' : 'text-gray-600'}`}>
                    {type}
                  </button>
                ))}
              </div>
              <form onSubmit={applyPriceFilter}>
                <h3 className="font-semibold mb-3">Price Range</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="input-field px-3 py-2"
                  />
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="input-field px-3 py-2"
                  />
                </div>
                <button type="submit" className="mt-3 w-full btn-secondary py-2">
                  Apply Price
                </button>
              </form>
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
