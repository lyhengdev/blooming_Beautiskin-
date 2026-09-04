import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.skinProfile.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@bloomingbeauty.com',
      password: adminPassword,
      role: Role.ADMIN,
      phone: '+85512345678',
    },
  });

  // Create demo customer
  const customerPassword = await bcrypt.hash('customer123', 12);
  const customer = await prisma.user.create({
    data: {
      name: 'Sophea Chan',
      email: 'sophea@example.com',
      password: customerPassword,
      phone: '+85598765432',
    },
  });

    // Create categories
    const categories = await Promise.all([
      prisma.category.create({
        data: {
          name: 'Cleanser',
          slug: 'cleanser',
          description: 'Face cleansers for every skin type',
          image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=85',
        },
      }),
      prisma.category.create({
        data: {
          name: 'Toner',
          slug: 'toner',
          description: 'Hydrating and balancing toners',
          image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&h=600&fit=crop&q=85',
        },
      }),
      prisma.category.create({
        data: {
          name: 'Serum',
          slug: 'serum',
          description: 'Concentrated treatment serums',
          image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop&q=85',
        },
      }),
      prisma.category.create({
        data: {
          name: 'Moisturizer',
          slug: 'moisturizer',
          description: 'Face creams and moisturizers',
          image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=600&fit=crop&q=85',
        },
      }),
      prisma.category.create({
        data: {
          name: 'Sunscreen',
          slug: 'sunscreen',
          description: 'UV protection for daily use',
          image: 'https://images.unsplash.com/photo-1556227834-09f1de7a7d14?w=600&h=600&fit=crop&q=85',
        },
      }),
      prisma.category.create({
        data: {
          name: 'Mask',
          slug: 'mask',
          description: 'Sheet masks and wash-off masks',
          image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=600&fit=crop&q=85',
        },
      }),
    ]);

    // Create brands
    const brands = await Promise.all([
      prisma.brand.create({
        data: {
          name: 'COSRX',
          slug: 'cosrx',
          description: 'Korean skincare brand known for simple, effective formulas',
          logo: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&h=400&fit=crop&q=85',
        },
      }),
      prisma.brand.create({
        data: {
          name: 'Innisfree',
          slug: 'innisfree',
          description: 'Natural Korean skincare from Jeju Island',
          logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=400&h=400&fit=crop&q=85',
        },
      }),
      prisma.brand.create({
        data: {
          name: 'Some By Mi',
          slug: 'some-by-mi',
          description: 'Korean skincare for problem skin',
          logo: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop&q=85',
        },
      }),
      prisma.brand.create({
        data: {
          name: 'Hada Labo',
          slug: 'hada-labo',
          description: 'Japanese skincare with hyaluronic acid',
          logo: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop&q=85',
        },
      }),
      prisma.brand.create({
        data: {
          name: 'Beauty of Joseon',
          slug: 'beauty-of-joseon',
          description: 'Korean hanbok-inspired skincare',
          logo: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=400&fit=crop&q=85',
        },
      }),
    ]);

  // Create products
  const products = [
    {
      name: 'Low pH Good Morning Gel Cleanser',
      slug: 'cosrx-low-ph-good-morning-gel-cleanser',
      description:
        'A gentle gel cleanser with tea tree oil that effectively removes impurities without stripping the skin. Perfect for oily and combination skin types. Its low pH formula maintains the skin\'s natural balance while providing a refreshing cleanse.',
      shortDesc: 'Gentle gel cleanser with tea tree oil for oily & combination skin',
      price: 12.99,
      comparePrice: 15.99,
      sku: 'COSRX-CLG-001',
      stock: 150,
      trackStock: false,
      isFeatured: true,
      skinTypes: ['OILY', 'COMBINATION'],
      concerns: ['Acne', 'Pores'],
      categoryId: categories[0].id,
      brandId: brands[0].id,
    },
    {
      name: 'AHA/BHA Clarifying Treatment Toner',
      slug: 'cosrx-aha-bha-clarifying-toner',
      description:
        'A gentle exfoliating toner that helps clear congested pores and prevent breakouts. Contains AHA and BHA to remove dead skin cells and control oil production.',
      shortDesc: 'Exfoliating toner with AHA/BHA for clear pores',
      price: 14.99,
      comparePrice: 18.99,
      sku: 'COSRX-TON-001',
      stock: 120,
      trackStock: false,
      isFeatured: true,
      skinTypes: ['OILY', 'COMBINATION'],
      concerns: ['Acne', 'Pores'],
      categoryId: categories[1].id,
      brandId: brands[0].id,
    },
    {
      name: 'Snail Mucin 96% Power Essence',
      slug: 'cosrx-snail-mucin-96-essence',
      description:
        'Lightweight essence containing 96% snail mucin to hydrate, repair, and protect the skin. Helps with acne scars, fine lines, and dullness. A cult favorite in K-beauty.',
      shortDesc: 'Hydrating essence with 96% snail mucin for repair & glow',
      price: 21.99,
      comparePrice: 25.99,
      sku: 'COSRX-SRM-001',
      stock: 200,
      trackStock: false,
      isFeatured: true,
      skinTypes: ['NORMAL', 'DRY', 'OILY', 'COMBINATION', 'SENSITIVE'],
      concerns: ['Hydration', 'Anti-aging', 'Hyperpigmentation'],
      categoryId: categories[2].id,
      brandId: brands[0].id,
    },
    {
      name: 'Oil-Free Ultra Moisturizing Lotion',
      slug: 'cosrx-oil-free-moisturizing-lotion',
      description:
        'A lightweight, oil-free moisturizer with birch sap that soothes and hydrates without clogging pores. Perfect for oily and acne-prone skin.',
      shortDesc: 'Oil-free moisturizer with birch sap for oily skin',
      price: 19.99,
      comparePrice: 23.99,
      sku: 'COSRX-MST-001',
      stock: 100,
      trackStock: true,
      isFeatured: true,
      skinTypes: ['OILY', 'COMBINATION'],
      concerns: ['Hydration', 'Acne'],
      categoryId: categories[3].id,
      brandId: brands[0].id,
    },
    {
      name: 'Green Tea Seed Serum',
      slug: 'innisfree-green-tea-seed-serum',
      description:
        'A hydrating serum infused with Jeju green tea seeds that provides deep moisture and antioxidant protection. Absorbs quickly and leaves skin feeling refreshed.',
      shortDesc: 'Hydrating serum with Jeju green tea antioxidants',
      price: 24.99,
      comparePrice: 29.99,
      sku: 'INNF-GTS-001',
      stock: 80,
      trackStock: true,
      isFeatured: true,
      skinTypes: ['NORMAL', 'DRY', 'COMBINATION'],
      concerns: ['Hydration', 'Anti-aging'],
      categoryId: categories[2].id,
      brandId: brands[1].id,
    },
    {
      name: 'Truecica Mineral 100 calming Suncream',
      slug: 'somebymi-truecica-minicalming-suncream',
      description:
        'A mineral sunscreen with Truecica that calms sensitive skin while providing SPF50+ PA++++ protection. Lightweight and non-greasy formula.',
      shortDesc: 'Calming mineral sunscreen SPF50+ for sensitive skin',
      price: 16.99,
      comparePrice: 19.99,
      sku: 'SBM-TMS-001',
      stock: 130,
      trackStock: false,
      isFeatured: true,
      skinTypes: ['SENSITIVE', 'NORMAL', 'DRY', 'OILY', 'COMBINATION'],
      concerns: ['Sun protection', 'Redness'],
      categoryId: categories[4].id,
      brandId: brands[2].id,
    },
    {
      name: 'AHA BHA PHA 30 Days Miracle Toner',
      slug: 'somebymi-aha-bha-pha-miracle-toner',
      description:
        'A multi-acid toner that exfoliates, hydrates, and soothes troubled skin. Contains tea tree extract and 10,000ppm of AHA/BHA/PHA for gentle yet effective exfoliation.',
      shortDesc: 'Multi-acid toner for troubled skin with 30-day promise',
      price: 14.99,
      comparePrice: 18.99,
      sku: 'SBM-MT-001',
      stock: 90,
      trackStock: true,
      skinTypes: ['OILY', 'COMBINATION'],
      concerns: ['Acne', 'Hyperpigmentation', 'Pores'],
      categoryId: categories[1].id,
      brandId: brands[2].id,
    },
    {
      name: 'Gokujyun Premium Hyaluronic Acid Lotion',
      slug: 'hada-labo-gokujyun-premium-lotion',
      description:
        'A deeply hydrating Japanese lotion with 5 types of hyaluronic acid. Layers moisture at different levels for long-lasting hydration. Fragrance-free.',
      shortDesc: 'Premium hyaluronic acid lotion with 5 types of HA',
      price: 15.99,
      comparePrice: 19.99,
      sku: 'HL-GPL-001',
      stock: 110,
      trackStock: false,
      skinTypes: ['DRY', 'NORMAL', 'SENSITIVE'],
      concerns: ['Hydration'],
      categoryId: categories[1].id,
      brandId: brands[3].id,
    },
    {
      name: 'Glow Serum : Niacinamide + Propolis',
      slug: 'beauty-of-joseon-glow-serum',
      description:
        'A brightening serum with 60% propolis extract and 2% niacinamide that helps fade dark spots, control oil, and give skin a natural glow. Inspired by Korean royal beauty secrets.',
      shortDesc: 'Brightening serum with propolis & niacinamide',
      price: 17.99,
      comparePrice: 21.99,
      sku: 'BOJ-GS-001',
      stock: 160,
      trackStock: false,
      isFeatured: true,
      skinTypes: ['NORMAL', 'DRY', 'OILY', 'COMBINATION'],
      concerns: ['Hyperpigmentation', 'Hydration'],
      categoryId: categories[2].id,
      brandId: brands[4].id,
    },
    {
      name: 'Centella Asiatica Light Cleansing Oil',
      slug: 'innisfree-centella-light-cleansing-oil',
      description:
        'A gentle cleansing oil infused with centella asiatica extract that melts away makeup and impurities without irritating the skin. Perfect first step in double cleansing.',
      shortDesc: 'Gentle cleansing oil with centella asiatica',
      price: 18.99,
      comparePrice: 22.99,
      sku: 'INNF-CAO-001',
      stock: 70,
      trackStock: true,
      skinTypes: ['NORMAL', 'DRY', 'COMBINATION', 'SENSITIVE'],
      concerns: ['Cleansing'],
      categoryId: categories[0].id,
      brandId: brands[1].id,
    },
    {
      name: 'Rice Probiotics Overnight Mask',
      slug: 'beauty-of-joseon-rice-probiotics-mask',
      description:
        'An overnight sleeping mask with rice bran and probiotics that nourishes and brightens skin while you sleep. Wake up with soft, glowing skin.',
      shortDesc: 'Overnight sleeping mask with rice & probiotics',
      price: 19.99,
      comparePrice: 24.99,
      sku: 'BOJ-RPM-001',
      stock: 85,
      trackStock: true,
      isFeatured: true,
      skinTypes: ['NORMAL', 'DRY', 'COMBINATION'],
      concerns: ['Hydration', 'Hyperpigmentation'],
      categoryId: categories[5].id,
      brandId: brands[4].id,
    },
    {
      name: 'Aloe Vera Soothing Gel',
      slug: 'innisfree-aloe-vera-soothing-gel',
      description:
        'A multi-purpose soothing gel made with Jeju organic aloe vera. Can be used on face and body for hydration and calming irritation. Lightweight and non-sticky.',
      shortDesc: 'Multi-purpose aloe gel for face & body',
      price: 8.99,
      comparePrice: 11.99,
      sku: 'INNF-AVG-001',
      stock: 200,
      trackStock: false,
      skinTypes: ['NORMAL', 'DRY', 'OILY', 'COMBINATION', 'SENSITIVE'],
      concerns: ['Hydration', 'Redness', 'Soothing'],
      categoryId: categories[3].id,
      brandId: brands[1].id,
    },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  // ── Product images ─────────────────────────────────────────────────────────
  const PRODUCT_IMAGES: Record<string, string[]> = {
    'cosrx-low-ph-good-morning-gel-cleanser':   ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop&q=85', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=800&fit=crop&q=85'],
    'cosrx-aha-bha-clarifying-toner':            ['https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=800&fit=crop&q=85', 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&h=800&fit=crop&q=85'],
    'cosrx-snail-mucin-96-essence':              ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=800&fit=crop&q=85', 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=800&h=800&fit=crop&q=85'],
    'cosrx-oil-free-moisturizing-lotion':        ['https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&h=800&fit=crop&q=85', 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800&h=800&fit=crop&q=85'],
    'innisfree-green-tea-seed-serum':            ['https://images.unsplash.com/photo-1546015720-b8b30df5aa27?w=800&h=800&fit=crop&q=85', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=800&fit=crop&q=85'],
    'somebymi-truecica-minicalming-suncream':    ['https://images.unsplash.com/photo-1556227834-09f1de7a7d14?w=800&h=800&fit=crop&q=85', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=800&fit=crop&q=85'],
    'somebymi-aha-bha-pha-miracle-toner':        ['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&h=800&fit=crop&q=85', 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=800&fit=crop&q=85'],
    'hada-labo-gokujyun-premium-lotion':         ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&h=800&fit=crop&q=85', 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&h=800&fit=crop&q=85'],
    'beauty-of-joseon-glow-serum':               ['https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&h=800&fit=crop&q=85', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=800&fit=crop&q=85'],
    'innisfree-centella-light-cleansing-oil':    ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop&q=85', 'https://images.unsplash.com/photo-1546015720-b8b30df5aa27?w=800&h=800&fit=crop&q=85'],
    'beauty-of-joseon-rice-probiotics-mask':     ['https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&h=800&fit=crop&q=85', 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&h=800&fit=crop&q=85'],
    'innisfree-aloe-vera-soothing-gel':          ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=800&fit=crop&q=85', 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800&h=800&fit=crop&q=85'],
  };

  const createdProducts = await prisma.product.findMany();
  for (const product of createdProducts) {
    const urls = PRODUCT_IMAGES[product.slug];
    if (!urls) continue;
    await prisma.productImage.createMany({
      data: urls.map((url, i) => ({
        productId: product.id,
        url,
        alt: `${product.name} - image ${i + 1}`,
        sortOrder: i,
      })),
    });
  }

  // Create a coupon
  await prisma.coupon.create({
    data: {
      code: 'BLOOM10',
      type: 'PERCENTAGE',
      value: 10,
      maxUses: 100,
      expiresAt: new Date('2026-12-31'),
    },
  });

  // Create sample blog posts
  await prisma.blogPost.create({
    data: {
      title: 'The Ultimate Guide to Korean Skincare Routine',
      slug: 'ultimate-guide-korean-skincare-routine',
      content:
        'Korean skincare is famous for its multi-step routine that focuses on layering products for maximum hydration and protection. Here\'s your complete guide to building the perfect K-beauty routine...\n\n## Step 1: Oil Cleanser\nStart with an oil-based cleanser to remove makeup and sunscreen...\n\n## Step 2: Water Cleanser\nFollow up with a water-based cleanser to remove sweat and dirt...\n\n## Step 3: Toner\nA hydrating toner prep your skin for the next steps...',
      excerpt:
        'Learn how to build the perfect 10-step Korean skincare routine for glowing, healthy skin.',
      coverImage: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=1200&h=600&fit=crop&q=85',
      authorId: admin.id,
      publishedAt: new Date(),
      tags: ['korean skincare', 'routine', 'beginner guide'],
    },
  });

  await prisma.blogPost.create({
    data: {
      title: 'Understanding Hyaluronic Acid: Your Skin\'s Best Friend',
      slug: 'understanding-hyaluronic-acid',
      content:
        'Hyaluronic acid is one of the most popular skincare ingredients, and for good reason. It can hold up to 1000 times its weight in water, making it a powerhouse hydrator...',
      excerpt:
        'Everything you need to know about hyaluronic acid and how to use it in your routine.',
      coverImage: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=400&fit=crop',
      authorId: admin.id,
      publishedAt: new Date(),
      tags: ['ingredients', 'hyaluronic acid', 'hydration'],
    },
  });

  // ── Banners ────────────────────────────────────────────────────────────
  await prisma.banner.createMany({
    data: [
      {
        title: 'Glow From Within',
        subtitle: 'Premium skincare curated for you',
        imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1400&q=85',
        ctaLabel: 'Shop Now',
        ctaLink: '/shop',
        badgeText: 'New Collection',
        sortOrder: 0,
        isActive: true,
      },
      {
        title: 'Shield Your Skin',
        subtitle: 'Same-day delivery available in Phnom Penh',
        imageUrl: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=1400&q=85',
        ctaLabel: 'View SPF Range',
        ctaLink: '/shop?category=sunscreen',
        badgeText: 'Free Delivery',
        sortOrder: 1,
        isActive: true,
      },
      {
        title: 'Your Skin Routine Starts Here',
        subtitle: 'Take our free skin quiz and get personalised picks',
        imageUrl: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=1400&q=85',
        ctaLabel: 'Take the Quiz',
        ctaLink: '/skin-quiz',
        badgeText: 'Free Quiz',
        sortOrder: 2,
        isActive: true,
      },
    ],
  });

  console.log('Database seeded successfully!');
  console.log('Admin: admin@bloomingbeauty.com / admin123');
  console.log('Customer: sophea@example.com / customer123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
