import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { normalizeBarcode } from '../src/lib/barcode';

const url = new URL(process.env.DATABASE_URL || 'postgresql://localhost/invalid');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test')) throw new Error('Demo seed requires an isolated local _test database');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({ where: { email: 'barcode@example.test' }, update: {}, create: { email: 'barcode@example.test', name: 'Barcode Demo', password: await bcrypt.hash('BarcodeDemo123!', 10), role: 'ADMIN' } });
  const brand = await prisma.brand.upsert({ where: { slug: 'barcode-demo' }, update: {}, create: { name: 'Barcode Demo', slug: 'barcode-demo' } });
  const category = await prisma.category.upsert({ where: { slug: 'barcode-demo' }, update: {}, create: { name: 'Skincare Demo', slug: 'barcode-demo' } });
  await prisma.product.upsert({ where: { sku: 'BARCODE-DEMO-CLEANSER' }, update: {}, create: {
    name: 'Demo Gentle Cleanser', slug: 'barcode-demo-cleanser', sku: 'BARCODE-DEMO-CLEANSER', price: 12.5, stock: 50, trackStock: true, brandId: brand.id, categoryId: category.id,
    images: { create: { url: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=240&q=80', alt: 'Skincare demo' } },
    barcodes: { create: normalizeBarcode('BBS-DEMO-CLEANSER', 'CODE_128') },
  } });
  await prisma.product.upsert({ where: { sku: 'BARCODE-DEMO-SERUM' }, update: {}, create: {
    name: 'Demo Hydrating Serum', slug: 'barcode-demo-serum', sku: 'BARCODE-DEMO-SERUM', price: 9, stock: 0, trackStock: true, brandId: brand.id, categoryId: category.id,
    images: { create: { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=240&q=80', alt: 'Skincare demo' } },
    variants: { create: [
      { name: '30 ml', price: 9, stock: 50, barcodes: { create: normalizeBarcode('036000291452') } },
      { name: '60 ml', price: 16, stock: 20, barcodes: { create: normalizeBarcode('BBS-DEMO-SERUM-60', 'CODE_128') } },
    ] },
  } });
  console.log('Local demo ready: barcode@example.test / BarcodeDemo123!');
}
main().finally(() => prisma.$disconnect());
