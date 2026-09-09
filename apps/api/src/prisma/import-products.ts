/**
 * One-time CSV import script for products.
 *
 * Usage:
 *   pnpm db:import:products
 *
 * Reads the CSV from .idea/POS_System_Data - Products.csv
 * and upserts into the production Neon database.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

// Normalize messy/typo'd category values found in the CSV
const CATEGORY_NORMALIZE: Record<string, string> = {
  suncream: 'Sunscreen',
  Suncream: 'Sunscreen',
  auncream: 'Sunscreen',
  mask: 'Mask',
  collagen: 'Collagen',
  lotion: 'Lotion',
  cream: 'Cream',
  spa: 'Spa',
  foam: 'Foam',
  soap: 'Soap',
  'haair care': 'Hair Care',
  'hair care': 'Hair Care',
  haircare: 'Hair Care',
  'armpit cream': 'Armpit Cream',
  toner: 'Toner',
  lip: 'Lip',
  Lip: 'Lip',
  eyecare: 'Eye Care',
  cleansing: 'Cleansing',
  Cleansing: 'Cleansing',
  cleasing: 'Cleansing',
  cleamser: 'Cleansing',
  cleanser: 'Cleansing',
  serum: 'Serum',
  Serum: 'Serum',
  'neck cream': 'Neck Cream',
  essence: 'Essence',
  'spot powder': 'Spot Powder',
  'spot cream': 'Spot Cream',
  scrub: 'Scrub',
  spray: 'Spray',
  lipcare: 'Lip Care',
  'toner pad': 'Toner Pad',
  'toner  pad': 'Toner Pad',
  ampoul: 'Ampoule',
  balm: 'Balm',
  'clay mask': 'Clay Mask',
  oil: 'Oil',
};

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting product CSV import...\n');

  // 1. Read CSV
  const csvPath = resolve(
    __dirname,
    '../../../../.idea/POS_System_Data - Products.csv',
  );
  const raw = readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());

  // Skip header
  const dataLines = lines.slice(1);
  console.log(`Found ${dataLines.length} CSV rows (excluding header)\n`);

  // 2. Parse rows
  interface CSVRow {
    id: string;
    name: string;
    price: number;
    costPrice: number;
    stock: number;
    category: string;
    description: string;
  }

  const rows: CSVRow[] = [];
  for (const line of dataLines) {
    const cols = parseCSVLine(line);
    const id = cols[0]?.trim();
    const name = cols[1]?.trim();
    const price = parseFloat(cols[2]) || 0;
    const stock = parseInt(cols[3]) || 0;
    const category = cols[4]?.trim() || '';
    const description = cols[5]?.trim() || '';
    const costPrice = parseFloat((cols[8] || '').replace(/[^0-9.]/g, '')) || 0;

    if (!id || !name) continue; // skip empty/blank rows

    rows.push({
        id,
        name,
        price,
        costPrice,
        stock,
        category: CATEGORY_NORMALIZE[category] ?? category,
        description,
      });
  }

  console.log(`Parsed ${rows.length} valid products\n`);

  // 3. Extract unique categories and create/find them
  const uniqueCategories = [...new Set(rows.map((r) => r.category).filter(Boolean))];
  console.log(`Categories to create/find: ${uniqueCategories.join(', ')}\n`);

  const categoryMap = new Map<string, string>(); // categoryName -> categoryId

  for (const catName of uniqueCategories) {
    const slug = slugify(catName);
    const category = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: {
        name: catName.charAt(0).toUpperCase() + catName.slice(1),
        slug,
        description: `${catName.charAt(0).toUpperCase() + catName.slice(1)} products`,
      },
    });
    categoryMap.set(catName, category.id);
  }

  // Also create an "Uncategorized" for products with no category
  const uncat = await prisma.category.upsert({
    where: { slug: 'uncategorized' },
    update: {},
    create: {
      name: 'Uncategorized',
      slug: 'uncategorized',
      description: 'Products without a specific category',
    },
  });

  console.log(`Created/found ${categoryMap.size + 1} categories (including Uncategorized)\n`);

  // 4. Create a default brand for CSV products (no brand in CSV)
  const defaultBrand = await prisma.brand.upsert({
    where: { slug: 'other' },
    update: {},
    create: {
      name: 'Other',
      slug: 'other',
      description: 'Products without a specific brand',
    },
  });
  console.log(`Default brand ready: ${defaultBrand.name} (${defaultBrand.id})\n`);

  // 5. Upsert products
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      let slug = slugify(row.name);
      const slugExists = await prisma.product.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (slugExists) {
        slug = `${slug}-${row.id.toLowerCase()}`;
      }

      const categoryId = row.category
        ? categoryMap.get(row.category) || uncat.id
        : uncat.id;

      const description =
        row.description && row.description !== '...'
          ? row.description
          : row.name;

      // Try upsert by SKU (the CSV ID is unique per product)
      const product = await prisma.product.upsert({
        where: { sku: row.id },
        update: {
          name: row.name,
          slug,
          price: row.price,
          costPrice: row.costPrice || null,
          stock: row.stock,
          categoryId,
          brandId: defaultBrand.id,
          description,
        },
        create: {
          name: row.name,
          slug,
          sku: row.id,
          price: row.price,
          costPrice: row.costPrice || null,
          stock: row.stock,
          trackStock: row.stock > 0,
          categoryId,
          brandId: defaultBrand.id,
          description,
        },
      });

      created++;
      if (created % 50 === 0) {
        console.log(`  Progress: ${created}/${rows.length} products upserted...`);
      }
    } catch (err: any) {
      skipped++;
      console.error(`  SKIP "${row.name}" (${row.id}): ${err.message}`);
    }
  }

  console.log('\n─ Import Summary ─────────────────────────────────');
  console.log(`  Total CSV rows:    ${rows.length}`);
  console.log(`  Upserted:          ${created}`);
  console.log(`  Skipped (errors):  ${skipped}`);
  console.log('─────────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
