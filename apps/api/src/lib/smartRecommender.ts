import type { Prisma } from '@prisma/client';

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    brand: { select: { id: true; name: true; slug: true } };
    category: { select: { id: true; name: true; slug: true } };
    images: { take: 1; orderBy: { sortOrder: 'asc' } };
    reviews: { select: { rating: true } };
  };
}>;

// ── Concern keyword mapping ──────────────────────────────────────────────────
// Maps canonical concern names to related keywords for fuzzy matching.
// Keys must match the values stored in Product.concerns and the quiz payload.
export const CONCERN_KEYWORDS: Record<string, string[]> = {
  acne: ['acne', 'breakout', 'pimple', 'blemish', 'blackhead', 'whitehead'],
  aging: ['aging', 'anti-aging', 'wrinkle', 'fine line', 'firmness', 'elasticity'],
  dark_spots: ['dark spot', 'hyperpigmentation', 'brightening', 'uneven tone', 'melanin'],
  hydration: ['hydration', 'moisture', 'dryness', 'dry', 'hyaluronic', 'dewy'],
  redness: ['redness', 'rosacea', 'sensitivity', 'calm', 'soothe', 'irritation'],
  pores: ['pore', 'large pore', 'minimize pore', 'oily', 'sebum'],
  sun_protection: ['sunscreen', 'spf', 'uv', 'sun protection', 'sun damage'],
  texture: ['texture', 'rough', 'exfoliation', 'smooth', 'resurfacing'],
  dullness: ['dull', 'radiance', 'glow', 'luminosity', 'revitalize'],
  dark_circles: ['dark circle', 'eye bag', 'puffiness', 'under eye'],
};

// ── Scoring weights ──────────────────────────────────────────────────────────
const WEIGHTS = {
  skinType: 0.4,
  concern: 0.35,
  rating: 0.15,
  featured: 0.1,
} as const;

// ── SmartRecommender ─────────────────────────────────────────────────────────
export class SmartRecommender {
  private avgRatingByCategory = new Map<string, number>();
  private globalAvgRating = 0;

  /**
   * Fit the recommender with the full active product catalogue.
   * Computes aggregate statistics used during scoring.
   */
  fit(products: ProductWithRelations[]): void {
    const ratingByCategory = new Map<string, number[]>();
    const allRatings: number[] = [];

    for (const product of products) {
      const avg = product.reviews.length > 0
        ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
        : 0;

      allRatings.push(avg);

      const catSlug = product.category.slug;
      if (!ratingByCategory.has(catSlug)) {
        ratingByCategory.set(catSlug, []);
      }
      ratingByCategory.get(catSlug)!.push(avg);
    }

    for (const [cat, ratings] of ratingByCategory) {
      this.avgRatingByCategory.set(
        cat,
        ratings.reduce((a, b) => a + b, 0) / ratings.length,
      );
    }

    this.globalAvgRating = allRatings.length > 0
      ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
      : 0;
  }

  /**
   * Score and rank candidate products for a given skin type + concerns.
   * Returns products sorted by relevance score (highest first).
   */
  recommend(
    candidates: ProductWithRelations[],
    skinType: string,
    concerns: string[],
  ): ProductWithRelations[] {
    const scored = candidates.map((product) => ({
      product,
      score: this.score(product, skinType, concerns),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => s.product);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private score(
    product: ProductWithRelations,
    skinType: string,
    concerns: string[],
  ): number {
    const skinTypeScore = this.scoreSkinType(product, skinType);
    const concernScore = this.scoreConcerns(product, concerns);
    const ratingScore = this.scoreRating(product);
    const featuredScore = product.isFeatured ? 1 : 0;

    return (
      WEIGHTS.skinType * skinTypeScore +
      WEIGHTS.concern * concernScore +
      WEIGHTS.rating * ratingScore +
      WEIGHTS.featured * featuredScore
    );
  }

  /**
   * 1.0 if product explicitly lists the skin type, 0.3 neutral if not mentioned.
   */
  private scoreSkinType(product: ProductWithRelations, skinType: string): number {
    const types = (product.skinTypes || []).map((t) => t.toUpperCase());
    if (types.includes(skinType.toUpperCase())) return 1.0;
    if (types.length === 0) return 0.3; // no skin-type data → don't penalize too hard
    return 0.1; // explicitly listed for other types → low score
  }

  /**
   * Fraction of user concerns addressed by this product, with keyword fuzzy matching.
   */
  private scoreConcerns(product: ProductWithRelations, concerns: string[]): number {
    if (concerns.length === 0) return 0.5;

    let matches = 0;
    for (const concern of concerns) {
      if (this.concernMatches(product, concern)) {
        matches++;
      }
    }

    return matches / concerns.length;
  }

  private concernMatches(product: ProductWithRelations, concern: string): boolean {
    const normalisedConcern = concern.toLowerCase().replace(/\s+/g, '_');

    // Direct match on product.concerns
    const productConcerns = (product.concerns || []).map((c) =>
      c.toLowerCase().replace(/\s+/g, '_'),
    );
    if (productConcerns.includes(normalisedConcern)) return true;

    // Keyword fuzzy match
    const keywords = CONCERN_KEYWORDS[normalisedConcern] || [];
    const productText = [
      product.name,
      product.description,
      product.shortDesc || '',
      ...(product.concerns || []),
    ]
      .join(' ')
      .toLowerCase();

    return keywords.some((kw) => productText.includes(kw));
  }

  /**
   * Normalised rating score (0-1). Products without reviews get the global average
   * so they aren't unfairly penalised.
   */
  private scoreRating(product: ProductWithRelations): number {
    const maxRating = 5;
    if (product.reviews.length === 0) {
      return this.globalAvgRating / maxRating;
    }
    const avg =
      product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length;
    return avg / maxRating;
  }
}
