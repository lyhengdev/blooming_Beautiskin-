/**
 * backfill-costs.ts
 * One-time script: snapshots current product costs into old order items
 * where costRecorded = false. After running, the "estimated profit"
 * warnings disappear from the dashboard.
 *
 * Run with:  pnpm exec tsx src/prisma/backfill-costs.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.orderItem.findMany({
    where: { costRecorded: false },
    include: { product: { select: { id: true, name: true, sku: true, costPrice: true } } },
  });

  const toBackfill = items.filter((item) => item.product.costPrice !== null);

  if (toBackfill.length === 0) {
    console.log('No order items need backfilling — all items either already have a recorded cost or the product has no cost set.');
    return;
  }

  console.log(`Found ${toBackfill.length} order items to backfill across ${new Set(toBackfill.map((i) => i.productId)).size} products.\n`);

  const grouped = new Map<string, { name: string; sku: string; cost: number; count: number }>();
  for (const item of toBackfill) {
    const key = item.productId;
    const existing = grouped.get(key) ?? { name: item.product.name, sku: item.product.sku, cost: Number(item.product.costPrice), count: 0 };
    existing.count += item.quantity;
    grouped.set(key, existing);
  }

  for (const [productId, info] of grouped) {
    console.log(`  ${info.name} (${info.sku || 'no SKU'}) — ${info.count} units × $${info.cost.toFixed(2)}`);
  }

  console.log('\nUpdating order items…');

  const result = await prisma.$transaction(
    toBackfill.map((item) =>
      prisma.orderItem.update({
        where: { id: item.id },
        data: { costPrice: item.product.costPrice, costRecorded: true },
      }),
    ),
  );

  console.log(`Done — updated ${result.length} order items. The estimate warnings are now gone.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
