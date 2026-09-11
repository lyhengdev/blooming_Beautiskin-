'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Package } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';

export interface StorefrontProductCardProduct {
  id: string;
  name: string;
  slug: string;
  shortDesc?: string | null;
  price: string | number;
  comparePrice?: string | number | null;
  brand?: { name: string; slug?: string } | null;
  images?: { url: string; alt?: string | null }[];
  avgRating?: number;
  reviewCount?: number;
}

interface ProductCardProps {
  product: StorefrontProductCardProduct;
  view?: 'grid' | 'list';
  showDescription?: boolean;
  showRating?: boolean;
}

export default function ProductCard({
  product,
  view = 'grid',
  showDescription = true,
  showRating = false,
}: ProductCardProps) {
  const image = product.images?.[0];
  const isList = view === 'list';

  return (
    <Link
      href={`/product/${product.slug}`}
      className={cn('card group', isList ? 'flex' : 'block')}
    >
      <div
        className={cn(
          'relative bg-blush-50 flex items-center justify-center overflow-hidden',
          isList ? 'w-40 flex-shrink-0' : 'aspect-square',
        )}
      >
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || product.name}
            fill
            sizes={isList ? '160px' : '(max-width: 640px) 50vw, 25vw'}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <Package className="h-10 w-10 text-primary-200 opacity-70" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {product.brand?.name && (
          <span className="badge-pink w-fit text-xs">{product.brand.name}</span>
        )}
        <h3 className={cn(
          'line-clamp-2 text-sm font-bold text-gray-800 transition-colors group-hover:text-primary-600',
          product.brand?.name ? 'mt-2' : '',
        )}>
          {product.name}
        </h3>
        {showDescription && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">
            {product.shortDesc ?? 'A gentle pick for your skincare routine.'}
          </p>
        )}
        {showRating && (
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={cn('text-xs', star <= (product.avgRating ?? 0) ? 'text-yellow-400' : 'text-gray-300')}
              >
                &#9733;
              </span>
            ))}
            <span className="ml-1 text-xs text-gray-400">({product.reviewCount ?? 0})</span>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-extrabold text-primary-600">{formatPrice(product.price)}</span>
            {product.comparePrice && (
              <span className="text-xs text-gray-400 line-through">{formatPrice(product.comparePrice)}</span>
            )}
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white shadow-pink-sm transition-colors group-hover:bg-primary-600">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
