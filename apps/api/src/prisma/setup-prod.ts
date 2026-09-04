/**
 * Production setup script — creates admin user + seeds HomeSettings
 * without wiping existing data.
 *
 * Usage:
 *   pnpm db:setup:prod
 */

import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Running production setup...');

  // 1. Create admin user (safe upsert — no data loss)
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bloomingbeauty.com' },
    update: { password: adminPassword, role: Role.ADMIN },
    create: {
      name: 'Admin',
      email: 'admin@bloomingbeauty.com',
      password: adminPassword,
      role: Role.ADMIN,
      phone: '+85512345678',
    },
  });
  console.log(`Admin user ready: ${admin.email}`);

  // 2. Seed HomeSettings (safe upsert — no data loss)
  await prisma.homeSetting.upsert({
    where: { key: 'promoBanner' },
    update: {},
    create: {
      key: 'promoBanner',
      value: {
        badgeText: 'Limited Offer',
        title: 'Get 10% Off Your First Order',
        subtitle:
          'Use code BLOOM10 at checkout. Valid on all products. No minimum order required.',
        code: 'BLOOM10',
        ctaLabel: 'Shop Now',
        ctaLink: '/shop',
      },
    },
  });

  await prisma.homeSetting.upsert({
    where: { key: 'trustBadges' },
    update: {},
    create: {
      key: 'trustBadges',
      value: {
        items: [
          {
            icon: 'ShieldCheck',
            bg: 'bg-sky-100',
            ic: 'text-sky-300',
            title: 'Authentic Products',
            text: 'Sourced from trusted brands and distributors. Every product is 100% genuine.',
          },
          {
            icon: 'Heart',
            bg: 'bg-blush-100',
            ic: 'text-primary-400',
            title: 'Seller-Curated',
            text: 'Handpicked with care for routines real people can use and love every day.',
          },
          {
            icon: 'Truck',
            bg: 'bg-peach-100',
            ic: 'text-peach-300',
            title: 'Cambodia Delivery',
            text: 'Free shipping on orders over $30. Same-day delivery available in Phnom Penh.',
          },
        ],
      },
    },
  });

  await prisma.homeSetting.upsert({
    where: { key: 'social' },
    update: {},
    create: {
      key: 'social',
      value: {
        links: [
          {
            label: 'Facebook',
            href: 'https://www.facebook.com/p/Blooming-Beauty-Skin-100067171744804/',
          },
          {
            label: 'Instagram',
            href: 'https://www.instagram.com/skinbloomingbeauty/',
          },
          {
            label: 'TikTok',
            href: 'https://www.tiktok.com/@skinbloomingbeauty2',
          },
          {
            label: 'Telegram',
            href: 'https://t.me/+vFrCO2pmNHthN2Fl',
          },
        ],
      },
    },
  });

  console.log('HomeSettings seeded');

  console.log('\nDone!');
  console.log('Admin credentials:');
  console.log('  Email:    admin@bloomingbeauty.com');
  console.log('  Password: admin123');
  console.log('  URL:      https://blooming-beautiskin.onrender.com/admin');
}

main()
  .catch((e) => {
    console.error('Setup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });