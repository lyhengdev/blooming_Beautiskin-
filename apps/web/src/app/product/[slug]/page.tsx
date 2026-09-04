'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Heart, ShoppingBag, Star, Minus, Plus, ChevronRight, Package, Zap } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc: string | null;
  price: string;
  comparePrice: string | null;
  stock: number;
  trackStock: boolean;
  brand: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string };
  images: { id: string; url: string; alt: string | null }[];
  variants: { id: string; name: string; price: string; stock: number }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    user: { id: string; name: string; avatar: string | null };
  }[];
  avgRating: number;
  reviewCount: number;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  shortDesc: string | null;
  price: string;
  comparePrice: string | null;
  images: { id: string; url: string; alt: string | null }[];
  brand: { id: string; name: string; slug: string };
  avgRating: number;
  reviewCount: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'ingredients' | 'reviews'>('description');
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedMsg, setAddedMsg] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const addToCart = useCartStore((s) => s.addToCart);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await api.get(`/products/${params.slug}`);
        setProduct(res.data.data.product);
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [params.slug]);

  useEffect(() => {
    if (!params.slug) return;
    async function fetchRelated() {
      try {
        const res = await api.get(`/products/${params.slug}/related`);
        setRelated(res.data.data.products || []);
      } catch {
        // Related products are non-critical — fail silently.
      }
    }
    fetchRelated();
  }, [params.slug]);

  useEffect(() => {
    if (!user || !product) return;
    async function checkWishlist() {
      try {
        const res = await api.get('/wishlist');
        const items = res.data.data.wishlist || [];
        setIsWishlisted(items.some((w: any) => w.productId === product!.id));
      } catch {}
    }
    checkWishlist();
  }, [user, product]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    try {
      await addToCart(product.id, quantity);
      setAddedMsg(true);
      setTimeout(() => setAddedMsg(false), 2000);
    } catch (err) {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if (!user) {
      toast.info('Please login to checkout', {
        action: { label: 'Login', onClick: () => router.push('/login?returnTo=' + encodeURIComponent(window.location.pathname)) },
      });
      return;
    }
    setBuyingNow(true);
    try {
      await addToCart(product.id, quantity);
      router.push('/checkout');
    } catch (err) {
      toast.error('Failed to add to cart');
      setBuyingNow(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      toast.info('Please login to add to wishlist', {
        action: { label: 'Login', onClick: () => router.push('/login?returnTo=' + encodeURIComponent(window.location.pathname)) },
      });
      return;
    }
    if (!product) return;
    try {
      if (isWishlisted) {
        await api.delete(`/wishlist/${product.id}`);
        setIsWishlisted(false);
      } else {
        await api.post(`/wishlist/${product.id}`);
        setIsWishlisted(true);
      }
    } catch {
      toast.error('Failed to update wishlist');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container-shop py-8">
          <div className="animate-pulse grid lg:grid-cols-2 gap-10">
            <div className="aspect-square bg-gray-200 rounded-xl" />
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-6 bg-gray-200 rounded w-1/6" />
              <div className="h-20 bg-gray-200 rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Product Not Found</h1>
            <Link href="/shop" className="mt-4 inline-block btn-primary">Back to Shop</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const ratingBreakdown = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: product.reviews.filter((rev) => rev.rating === r).length,
  }));

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="container-shop py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-primary-600">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/shop" className="hover:text-primary-600">Shop</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-primary-600">{product.category.name}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900 truncate flex-1 min-w-0">{product.name}</span>
          </nav>
        </div>

        <div className="container-shop pb-16">
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                {product.images.length > 0 ? (
                  <Image src={product.images[selectedImage]?.url || product.images[0].url}
                    alt={product.name} fill className="object-cover" unoptimized />
                ) : (
                  <Package className="h-16 w-16 text-gray-300" />
                )}
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1">
                  {product.images.map((img, i) => (
                    <button key={img.id} onClick={() => setSelectedImage(i)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 ${selectedImage === i ? 'border-primary-500' : 'border-transparent'}`}>
                      <Image src={img.url} alt={img.alt || ''} fill className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Link href={`/shop?brand=${product.brand.slug}`} className="text-sm text-primary-600 font-medium hover:underline">{product.brand.name}</Link>
              <h1 className="text-2xl lg:text-3xl font-heading font-bold text-gray-900 mt-2">{product.name}</h1>

              <div className="flex items-center gap-2 mt-3">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= product.avgRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-sm text-gray-500">{product.avgRating} ({product.reviewCount} reviews)</span>
              </div>

              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-2xl sm:text-3xl font-bold text-primary-600">${product.price}</span>
                {product.comparePrice && (
                  <>
                    <span className="text-lg text-gray-400 line-through">${product.comparePrice}</span>
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded">
                      -{Math.round(((Number(product.comparePrice) - Number(product.price)) / Number(product.comparePrice)) * 100)}%
                    </span>
                  </>
                )}
              </div>

              {product.shortDesc && <p className="mt-4 text-gray-600">{product.shortDesc}</p>}

              <div className="mt-4">
                {!product.trackStock ? (
                  <span className="text-sm text-green-600 font-medium">In Stock</span>
                ) : product.stock > 10 ? (
                  <span className="text-sm text-green-600 font-medium">In Stock</span>
                ) : product.stock > 0 ? (
                  <span className="text-sm text-orange-500 font-medium">Low Stock - Only {product.stock} left</span>
                ) : (
                  <span className="text-sm text-red-500 font-medium">Out of Stock</span>
                )}
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center border rounded-lg">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-gray-50"><Minus className="h-4 w-4" /></button>
                  <span className="px-4 py-2 font-medium min-w-[40px] text-center">{quantity}</span>
                  <button onClick={() => setQuantity(product.trackStock ? Math.min(product.stock, quantity + 1) : Math.min(99, quantity + 1))}
                    disabled={product.trackStock ? quantity >= product.stock : quantity >= 99}
                    className="p-3 hover:bg-gray-50 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
                </div>
                <button onClick={handleAddToCart} disabled={(product.trackStock && product.stock === 0) || addingToCart || buyingNow}
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                  {addedMsg ? (
                    <>Added!</>
                  ) : addingToCart ? (
                    <>Adding...</>
                  ) : (
                    <><ShoppingBag className="h-5 w-5" /> Add to Cart</>
                  )}
                </button>
                <button onClick={handleBuyNow} disabled={(product.trackStock && product.stock === 0) || buyingNow || addingToCart}
                  className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                  <Zap className="h-5 w-5" /> Buy Now
                </button>
              </div>
              <div className="mt-3 flex justify-end">
                <button onClick={handleToggleWishlist}
                  className={`p-3 border rounded-lg hover:bg-gray-50 transition-colors ${isWishlisted ? 'bg-red-50 border-red-200' : ''}`}>
                  <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
              </div>

              <div className="mt-8 border-t pt-6">
                <div className="flex gap-4 sm:gap-6 border-b overflow-x-auto scrollbar-hide">
                  {(['description', 'ingredients', 'reviews'] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`pb-3 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
                      {tab} {tab === 'reviews' && `(${product.reviewCount})`}
                    </button>
                  ))}
                </div>
                <div className="py-6">
                  {activeTab === 'description' && (
                    <div className="text-sm text-gray-600 whitespace-pre-line">{product.description}</div>
                  )}
                  {activeTab === 'ingredients' && (
                    <p className="text-sm text-gray-600">Full ingredient list will be available soon.</p>
                  )}
                  {activeTab === 'reviews' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-8">
                        <div className="text-center">
                          <p className="text-4xl font-bold text-gray-900">{product.avgRating}</p>
                          <div className="flex mt-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`h-4 w-4 ${s <= product.avgRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{product.reviewCount} reviews</p>
                        </div>
                        <div className="flex-1 space-y-2">
                          {ratingBreakdown.map((r) => (
                            <div key={r.rating} className="flex items-center gap-2 text-sm">
                              <span className="w-8 flex items-center gap-0.5">{r.rating}<Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" /></span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div className="bg-yellow-400 h-2 rounded-full"
                                  style={{ width: `${product.reviewCount > 0 ? (r.count / product.reviewCount) * 100 : 0}%` }} />
                              </div>
                              <span className="w-8 text-gray-500">{r.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {product.reviews.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No reviews yet. Be the first to review!</p>
                      ) : (
                        <div className="space-y-4">
                          {product.reviews.map((review) => (
                            <div key={review.id} className="border rounded-lg p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium text-primary-700">
                                  {review.user.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{review.user.name}</p>
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              {review.comment && <p className="mt-2 text-sm text-gray-600">{review.comment}</p>}
                              <p className="mt-2 text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            You May Also Like — related products
        ══════════════════════════════════════════════════════════ */}
        {related.length > 0 && (
          <section className="py-12 lg:py-16 bg-white border-t border-blush-100">
            <div className="container-shop">
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-xl font-heading font-extrabold text-gray-900 sm:text-2xl">
                  You May Also Like
                </h2>
                <Link href="/shop" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                  View all →
                </Link>
              </div>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
                {related.map((p) => {
                  const discount =
                    p.comparePrice && Number(p.comparePrice) > Number(p.price)
                      ? Math.round(((Number(p.comparePrice) - Number(p.price)) / Number(p.comparePrice)) * 100)
                      : 0;
                  return (
                    <Link
                      key={p.id}
                      href={`/product/${p.slug}`}
                      className="group flex w-[180px] sm:w-[200px] shrink-0 flex-col rounded-2xl border border-blush-100 bg-white p-3 shadow-pink-sm hover:shadow-pink-md transition-all hover:-translate-y-0.5"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-xl bg-blush-50 mb-3">
                        {p.images?.[0]?.url ? (
                          <Image
                            src={p.images[0].url}
                            alt={p.images[0].alt || p.name}
                            fill
                            sizes="200px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-300">
                            <Package className="h-8 w-8" />
                          </div>
                        )}
                        {discount > 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            -{discount}%
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-primary-400 truncate">
                        {p.brand?.name}
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-800 leading-snug">
                        {p.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span>{p.avgRating > 0 ? p.avgRating.toFixed(1) : '0.0'}</span>
                        <span>({p.reviewCount})</span>
                      </div>
                      <div className="mt-auto flex items-baseline gap-2 pt-2">
                        <span className="font-bold text-primary-600">${formatPrice(Number(p.price))}</span>
                        {p.comparePrice && Number(p.comparePrice) > Number(p.price) && (
                          <span className="text-xs text-gray-400 line-through">
                            ${formatPrice(Number(p.comparePrice))}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
