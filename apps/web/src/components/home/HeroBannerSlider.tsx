'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';

const INTERVAL = 4500;

// Verified Unsplash skincare images — mirrors the DB seed
// 1522335789203 = assortment of makeup products on pink background
// 1616394584738 = skincare cream / beauty products flatlay
// 1612817288484 = skincare products flatlay
const FALLBACKS = [
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1400&q=85',
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=1400&q=85',
  'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=1400&q=85',
];

export default function HeroBannerSlider() {
  const [idx, setIdx]       = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick]     = useState(0);
  const timerRef            = useRef<ReturnType<typeof setInterval>>();

  const { data, isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: () => api.get('/banners'),
  });

  const banners = useMemo<string[]>(() => {
    const list = data?.data?.data?.banners;
    if (Array.isArray(list) && list.length > 0) {
      const urls = list.map((b: { imageUrl?: string }) => b.imageUrl).filter(Boolean) as string[];
      if (urls.length > 0) return urls;
    }
    return FALLBACKS;
  }, [data]);

  const total = banners.length;
  const at    = ((idx % total) + total) % total;

  const goTo = useCallback((next: number) => {
    setIdx(((next % total) + total) % total);
  }, [total]);

  const prev = useCallback(() => goTo(idx - 1), [idx, goTo]);
  const next = useCallback(() => goTo(idx + 1), [idx, goTo]);

  // Auto-advance
  useEffect(() => {
    if (paused || total <= 1) return;
    timerRef.current = setInterval(() => setIdx((p) => (p + 1) % total), INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [paused, total]);

  // Restart progress bar whenever the active slide changes
  useEffect(() => { setTick((t) => t + 1); }, [idx]);

  if (isLoading) {
    return (
      <div className="h-[300px] sm:h-[420px] lg:h-[520px] w-full animate-pulse bg-blush-100" />
    );
  }

  return (
    <div
      className="relative w-full h-[300px] sm:h-[420px] lg:h-[520px] overflow-hidden group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Slides ───────────────────────────────────────────────────── */}
      <div
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${at * 100}%)` }}
      >
        {banners.map((src, i) => (
          <div key={i} className="relative flex-shrink-0 w-full h-full">
            <Image
              src={src}
              alt={`Banner ${i + 1}`}
              fill
              className="object-cover"
              unoptimized
              priority={i === 0}
            />
          </div>
        ))}
      </div>

      {/* ── Prev / Next arrows (visible on hover) ────────────────────── */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20
                       flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center
                       rounded-full bg-white/70 text-gray-800 shadow-md backdrop-blur-sm
                       opacity-0 group-hover:opacity-100 transition-opacity duration-200
                       hover:bg-white active:scale-95"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <button
            onClick={next}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20
                       flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center
                       rounded-full bg-white/70 text-gray-800 shadow-md backdrop-blur-sm
                       opacity-0 group-hover:opacity-100 transition-opacity duration-200
                       hover:bg-white active:scale-95"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      )}

      {/* ── Dot indicators ───────────────────────────────────────────── */}
      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all duration-300
                          ${i === at
                            ? 'w-6 h-2.5 bg-white shadow-md'
                            : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'
                          }`}
            />
          ))}
        </div>
      )}

      {/* ── Progress bar ─────────────────────────────────────────────── */}
      {total > 1 && (
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black/10 z-10">
          <div
            key={tick}
            className="h-full bg-white/80 origin-left"
            style={{ animation: `bannerProgress ${INTERVAL}ms linear` }}
          />
        </div>
      )}

      <style>{`
        @keyframes bannerProgress {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </div>
  );
}
