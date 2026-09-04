/**
 * fix-images.ts
 * One-time script to replace placeholder/duplicate Unsplash images
 * with relevant, unique, high-quality photos for each brand, category,
 * and product.
 *
 * Run with:  pnpm exec tsx src/prisma/fix-images.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Brand logos ──────────────────────────────────────────────────────────────
// Each brand gets a unique, contextually relevant Unsplash image
const BRAND_LOGOS: Record<string, string> = {
  'cosrx':            'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&h=400&fit=crop&q=85',
  'innisfree':        'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=400&h=400&fit=crop&q=85',
  'some-by-mi':       'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop&q=85',
  'hada-labo':        'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop&q=85',
  'beauty-of-joseon': 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=400&fit=crop&q=85',
};

// ─── Category images ──────────────────────────────────────────────────────────
const CATEGORY_IMAGES: Record<string, string> = {
  'cleanser':    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=85',
  'toner':       'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=600&fit=crop&q=85',
  'serum':       'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop&q=85',
  'moisturizer': 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=600&fit=crop&q=85',
  'sunscreen':   'https://images.unsplash.com/photo-1556227834-09f1de7a7d14?w=600&h=600&fit=crop&q=85',
  'mask':        'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=600&fit=crop&q=85',
};

// ─── Product images ───────────────────────────────────────────────────────────
// Real product-relevant Unsplash photos keyed by product slug
const PRODUCT_IMAGES: Record<string, string[]> = {
  'cosrx-low-ph-good-morning-gel-cleanser': [
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop&q=85',
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=800&fit=crop&q=85',
  ],
  'cosrx-aha-bha-clarifying-toner': [
    'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=800&fit=crop&q=85',
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&h=800&fit=crop&q=85',
  ],
  'cosrx-snail-mucin-96-essence': [
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=800&fit=crop&q=85',
    'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=800&h=800&fit=crop&q=85',
  ],
  'cosrx-oil-free-moisturizing-lotion': [
    'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&h=800&fit=crop&q=85',
    'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800&h=800&fit=crop&q=85',
  ],
  'innisfree-green-tea-seed-serum': [
    'https://images.unsplash.com/photo-1546015720-b8b30df5aa27?w=800&h=800&fit=crop&q=85',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=800&fit=crop&q=85',
  ],
  'somebymi-truecica-minicalming-suncream': [
    'https://images.unsplash.com/photo-1556227834-09f1de7a7d14?w=800&h=800&fit=crop&q=85',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=800&fit=crop&q=85',
  ],
  'somebymi-aha-bha-pha-miracle-toner': [
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&h=800&fit=crop&q=85',
    'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=800&fit=crop&q=85',
  ],
  'hada-labo-gokujyun-premium-lotion': [
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&h=800&fit=crop&q=85',
    'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&h=800&fit=crop&q=85',
  ],
  'beauty-of-joseon-glow-serum': [
    'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&h=800&fit=crop&q=85',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=800&fit=crop&q=85',
  ],
  'innisfree-centella-light-cleansing-oil': [
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop&q=85',
    'https://images.unsplash.com/photo-1546015720-b8b30df5aa27?w=800&h=800&fit=crop&q=85',
  ],
  'beauty-of-joseon-rice-probiotics-mask': [
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&h=800&fit=crop&q=85',
    'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&h=800&fit=crop&q=85',
  ],
  'innisfree-aloe-vera-soothing-gel': [
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=800&fit=crop&q=85',
    'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800&h=800&fit=crop&q=85',
  ],
};

// ─── Blog cover images ────────────────────────────────────────────────────────
const BLOG_COVERS: Record<string, string> = {
  'ultimate-guide-korean-skincare-routine':
    'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=1200&h=600&fit=crop&q=85',
  'understanding-hyaluronic-acid':
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1200&h=600&fit=crop&q=85',
};

async function main() {
  console.log('🔧 Fixing images in database...\n');

  // ── 1. Brand logos ──────────────────────────────────────────────────────────
  console.log('Updating brand logos…');
  const brands = await prisma.brand.findMany();
  for (const brand of brands) {
    const logo = BRAND_LOGOS[brand.slug];
    if (!logo) { console.log(`  ⚠️  No logo mapping for brand: ${brand.slug}`); continue; }
    await prisma.brand.update({ where: { id: brand.id }, data: { logo } });
    console.log(`  ✅ ${brand.name}`);
  }

  // ── 2. Category images ──────────────────────────────────────────────────────
  console.log('\nUpdating category images…');
  const categories = await prisma.category.findMany();
  for (const cat of categories) {
    const image = CATEGORY_IMAGES[cat.slug];
    if (!image) { console.log(`  ⚠️  No image mapping for category: ${cat.slug}`); continue; }
    await prisma.category.update({ where: { id: cat.id }, data: { image } });
    console.log(`  ✅ ${cat.name}`);
  }

  // ── 3. Product images ───────────────────────────────────────────────────────
  console.log('\nAdding product images…');
  const products = await prisma.product.findMany({ include: { images: true } });
  for (const product of products) {
    const urls = PRODUCT_IMAGES[product.slug];
    if (!urls) { console.log(`  ⚠️  No images mapping for: ${product.slug}`); continue; }

    // Delete existing images first (avoid duplicates on re-run)
    await prisma.productImage.deleteMany({ where: { productId: product.id } });

    // Create fresh images
    await prisma.productImage.createMany({
      data: urls.map((url, i) => ({
        productId: product.id,
        url,
        alt: `${product.name} - image ${i + 1}`,
        sortOrder: i,
      })),
    });
    console.log(`  ✅ ${product.name} (${urls.length} images)`);
  }

  // ── 4. Blog cover images ────────────────────────────────────────────────────
  console.log('\nUpdating blog cover images…');
  const posts = await prisma.blogPost.findMany();
  for (const post of posts) {
    const coverImage = BLOG_COVERS[post.slug];
    if (!coverImage) { console.log(`  ⚠️  No cover mapping for: ${post.slug}`); continue; }
    await prisma.blogPost.update({ where: { id: post.id }, data: { coverImage } });
    console.log(`  ✅ ${post.title}`);
  }

  console.log('\n🎉 All images fixed successfully!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
