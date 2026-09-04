'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ClipboardCheck, ChevronRight, ChevronLeft, Check, ShoppingCart, Star, Sparkles, Heart, Droplet, SunDim, Moon, Flower2, Droplets, Sun, Package } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const SKIN_TYPES = [
  { id: 'OILY', title: 'Oily', icon: Droplet, desc: 'Shiny appearance, visible pores, prone to acne' },
  { id: 'DRY', title: 'Dry', icon: SunDim, desc: 'Tight feeling, flaky patches, rough texture' },
  { id: 'NORMAL', title: 'Normal', icon: Sparkles, desc: 'Balanced, few imperfections, minimal sensitivity' },
  { id: 'COMBINATION', title: 'Combination', icon: Moon, desc: 'Oily T-zone, dry cheeks, varying pore size' },
  { id: 'SENSITIVE', title: 'Sensitive', icon: Flower2, desc: 'Easily irritated, redness, stinging or burning' },
];

const CONCERNS = ['Hydration', 'Acne', 'Anti-aging', 'Hyperpigmentation', 'Pores', 'Redness', 'Sun protection', 'Soothing'];

const STEPS = ['Skin Type', 'Concerns', 'Results'];

type QuizRecommendation = {
  id?: string;
  name: string;
  slug: string;
  shortDesc?: string | null;
  price: number | string;
  brand?: { name: string } | null;
  avgRating?: number;
  reviewCount?: number;
  reason?: string;
  images?: { url: string; alt?: string | null }[];
};

const FALLBACK_RECOMMENDATIONS = [
  { name: 'Snail Mucin 96% Power Essence', slug: 'cosrx-snail-mucin-96-essence', shortDesc: 'Hydrating essence with 96% snail mucin', price: 21.99, brand: { name: 'COSRX' }, avgRating: 4.8, reviewCount: 245, reason: 'Universal hydrator for all skin types', images: [] },
  { name: 'Gokujyun Premium Hyaluronic Acid Lotion', slug: 'hada-labo-gokujyun-premium-lotion', shortDesc: '5 types of hyaluronic acid', price: 15.99, brand: { name: 'Hada Labo' }, avgRating: 4.7, reviewCount: 189, reason: 'Deep multi-level hydration', images: [] },
  { name: 'Glow Serum : Niacinamide + Propolis', slug: 'beauty-of-joseon-glow-serum', shortDesc: 'Brightening serum with propolis', price: 17.99, brand: { name: 'Beauty of Joseon' }, avgRating: 4.9, reviewCount: 312, reason: 'Targets dark spots and dullness', images: [] },
];

export default function SkinQuizPage() {
  const [step, setStep] = useState(0);
  const [skinType, setSkinType] = useState<string | null>(null);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<QuizRecommendation[]>([]);
  const [apiFailed, setApiFailed] = useState(false);
  const { addToCart } = useCartStore();

  const getQuizProducts = async () => {
    setLoading(true);
    setApiFailed(false);
    try {
      const res = await api.post('/skin-quiz', { skinType, concerns: selectedConcerns });
      setRecommendations(res.data.data.products);
    } catch {
      setRecommendations(FALLBACK_RECOMMENDATIONS);
      setApiFailed(true);
    } finally {
      setLoading(false);
      setStep(2);
    }
  };

  const toggleConcern = (concern: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
    );
  };

  const next = () => {
    if (step === 0 && skinType) setStep(1);
    else if (step === 1 && selectedConcerns.length > 0) getQuizProducts();
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-primary-50 via-pink-50 to-white py-8 lg:py-16">
          <div className="container-shop">
            <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-primary-700 shadow-sm ring-1 ring-primary-100">
                  <Sparkles className="h-4 w-4" />
                  Blooming Beauty Skin consultation
                </div>
                <h1 className="max-w-3xl text-2xl sm:text-3xl lg:text-5xl font-heading font-bold leading-tight text-gray-900">
                  Build a cute, soft routine your skin will actually love
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg sm:leading-8 text-gray-600">
                  Tell us your skin type and concerns. We will curate Korean and Japanese skincare picks like a caring beauty seller choosing products for your real daily routine.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-600">
                  {['Authentic brands', 'Soft daily routine', 'Skin-first picks'].map((label) => (
                    <span key={label} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-primary-100">
                      <Heart className="h-3.5 w-3.5 text-primary-600" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-primary-100">
                <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-primary-100 via-pink-100 to-white p-5">
                  <div className="grid h-full grid-cols-2 gap-3">
                    {[
                      { name: 'Cleanser', icon: Droplets },
                      { name: 'Serum', icon: Flower2 },
                      { name: 'Cream', icon: Droplets },
                      { name: 'SPF', icon: Sun },
                    ].map((step, index) => (
                      <div key={step.name} className="flex flex-col justify-between rounded-xl bg-white/80 p-4 shadow-sm">
                        <span className="text-xs font-medium uppercase tracking-wide text-primary-600">Step {index + 1}</span>
                        <step.icon className="h-10 w-10 text-primary-600" />
                        <p className="font-heading font-bold text-gray-900">{step.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-shop py-10 lg:py-14">
          <div className="mx-auto max-w-4xl rounded-2xl border border-primary-100 bg-white p-5 shadow-sm sm:p-8">

        {/* Progress */}
        <div className="mb-10 flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                i <= step ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`hidden text-xs font-medium sm:inline ${i === step ? 'text-primary-600' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 transition-all duration-300 ${i < step ? 'bg-primary-600' : 'bg-gray-100'}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Skin Type */}
        {step === 0 && (
          <div className="animate-slide-up">
            <div className="mb-6 text-center">
              <p className="text-sm font-medium text-primary-600">Step 1</p>
              <h2 className="mt-1 text-xl sm:text-2xl font-heading font-bold text-gray-900">What's your skin type?</h2>
              <p className="mt-2 text-sm text-gray-500">Choose the option that feels closest to your skin most days.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SKIN_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSkinType(type.id)}
                  className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all duration-200 ${
                    skinType === type.id
                      ? 'border-primary-500 bg-primary-50 shadow-sm'
                      : 'border-gray-100 bg-white hover:border-primary-200 hover:bg-primary-50/40'
                  }`}
                >
                  <span className="text-3xl">{type.icon && <type.icon className="h-8 w-8 text-primary-600" />}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{type.title}</div>
                    <div className="text-sm text-gray-500">{type.desc}</div>
                  </div>
                  {skinType === type.id && (
                    <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Concerns */}
        {step === 1 && (
          <div className="animate-slide-up">
            <div className="mb-6 text-center">
              <p className="text-sm font-medium text-primary-600">Step 2</p>
              <h2 className="mt-1 text-xl sm:text-2xl font-heading font-bold text-gray-900">What should your routine help with?</h2>
              <p className="mt-2 text-sm text-gray-500">Pick every concern you want your skincare to support.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {CONCERNS.map((concern) => (
                <button
                  key={concern}
                  onClick={() => toggleConcern(concern)}
                  className={`rounded-full border-2 px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                    selectedConcerns.includes(concern)
                      ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                      : 'border-gray-100 bg-white text-gray-700 hover:border-primary-200 hover:bg-primary-50'
                  }`}
                >
                  {selectedConcerns.includes(concern) && <Check className="w-3 h-3 inline mr-1" />}
                  {concern}
                </button>
              ))}
            </div>
            {selectedConcerns.length > 0 && (
              <p className="text-center text-sm text-gray-500 mt-4">{selectedConcerns.length} selected</p>
            )}
          </div>
        )}

        {/* Step 2: Results */}
        {step === 2 && (
          <div className="animate-slide-up">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Finding your soft skin picks...</p>
              </div>
            ) : (
              <>
                {apiFailed && (
                  <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
                    Showing general recommendations — API is still warming up.
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-medium text-primary-600">Your Blooming routine</p>
                  <h2 className="mt-1 text-2xl sm:text-3xl font-heading font-bold text-gray-900">Products picked with care</h2>
                </div>
                <p className="mb-8 mt-3 text-center text-sm text-gray-500">
                  Based on your {SKIN_TYPES.find((t) => t.id === skinType)?.title.toLowerCase()} skin
                  {selectedConcerns.length > 0 && ` and concerns: ${selectedConcerns.join(', ').toLowerCase()}`}
                </p>

                {recommendations.length === 0 ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 py-12 text-center">
                    <p className="mb-4 text-gray-500">No exact matches found.</p>
                    <Link href="/shop" className="font-medium text-primary-600 hover:underline">Browse all products</Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((product, i) => (
                      <div
                        key={product.slug}
                        className="flex flex-col items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md sm:flex-row"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <div className="relative w-24 h-24 bg-primary-50 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                          {product.images && product.images.length > 0 ? (
                            <Image src={product.images[0].url} alt={product.name} fill className="object-cover" unoptimized />
                          ) : (
                            <Package className="h-8 w-8 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <div className="text-xs text-primary-600 font-medium">{product.brand?.name}</div>
                          <Link href={`/product/${product.slug}`} className="font-semibold text-gray-900 transition-colors hover:text-primary-600">
                            {product.name}
                          </Link>
                          <p className="text-sm text-gray-500 mt-0.5">{product.shortDesc || product.reason}</p>
                          <div className="flex items-center gap-1 mt-1 justify-center sm:justify-start">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs text-gray-600">{product.avgRating || '—'}</span>
                            {(product.reviewCount ?? 0) > 0 && <span className="text-xs text-gray-400">({product.reviewCount})</span>}
                          </div>
                        </div>
                        <div className="text-center sm:text-right shrink-0">
                          <div className="font-bold text-primary-600">{formatPrice(product.price)}</div>
                          <button
                            onClick={() => product.id && addToCart(product.id)}
                            disabled={!product.id}
                            className="mt-2 flex items-center gap-1 rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:bg-primary-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 mx-auto sm:mx-0"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-center mt-8">
                  <button
                    onClick={() => { setStep(0); setSkinType(null); setSelectedConcerns([]); setRecommendations([]); setApiFailed(false); }}
                    className="text-sm font-medium text-primary-600 hover:underline"
                  >
                    Retake Quiz
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Navigation */}
        {step < 2 && (
          <div className="flex justify-center gap-4 mt-10">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 px-5 py-2.5 text-gray-500 transition-colors hover:text-gray-900">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            <button
              onClick={next}
              disabled={(step === 0 && !skinType) || (step === 1 && selectedConcerns.length === 0)}
              className="flex items-center gap-1 rounded-xl bg-primary-600 px-8 py-3 font-semibold text-white transition-all duration-200 hover:bg-primary-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step === 1 ? 'See Results' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
