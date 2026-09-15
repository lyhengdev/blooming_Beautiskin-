import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfitStats, withoutOrderCosts } from '../src/lib/profit';
const now = new Date('2026-09-15T05:00:00Z');
const item = (extra = {}) => ({ productId: 'cream', quantity: 2, price: '10.00', costPrice: '4.00', costRecorded: true, product: { name: 'Cream', sku: 'CRM', costPrice: '9.00' }, ...extra });
const order = (extra = {}) => ({ status: 'CONFIRMED', createdAt: now, total: '18.50', shippingCost: '1.50', items: [item()], ...extra });
test('discounts and shipping use actual charged sales; saved costs survive catalog edits', () => {
  const stats = calculateProfitStats([order()], now);
  assert.equal(stats.allTime.revenue, 17);
  assert.equal(stats.allTime.cost, 8);
  assert.equal(stats.allTime.profit, 9);
  assert.equal(stats.allTime.margin, 52.94);
});
test('repeated mixed-price sales sum correctly and exclude cancelled/refunded orders', () => {
  const stats = calculateProfitStats([order(), order({ total: 31.5, items: [item({ price: 15 })] }), order({ status: 'CANCELLED' }), order({ status: 'REFUNDED' })], now);
  assert.equal(stats.topProducts[0].revenue, 47);
  assert.equal(stats.topProducts[0].unitsSold, 4);
  assert.equal(stats.allTime.profit, 31);
});
test('missing costs are incomplete, zero is valid, and losses remain negative', () => {
  assert.equal(calculateProfitStats([order({ items: [item({ costPrice: null })] })], now).allTime.profit, null);
  assert.equal(calculateProfitStats([order({ items: [item({ costPrice: 0 })] })], now).allTime.profit, 17);
  assert.equal(calculateProfitStats([order({ items: [item({ costPrice: 12 })] })], now).allTime.profit, -7);
});
test('legacy costs are estimates, while new missing snapshots stay unknown', () => {
  const stats = calculateProfitStats([order({ items: [item({ costPrice: null, costRecorded: false })] })], now);
  assert.equal(stats.allTime.estimatedUnits, 2);
  assert.equal(stats.allTime.profit, -1);
  assert.equal(calculateProfitStats([order({ items: [item({ costPrice: null })] })], now).allTime.unitsWithoutCost, 2);
});
test('periods use Cambodia midnight and exclude older orders', () => {
  const stats = calculateProfitStats([order({ createdAt: new Date('2026-09-14T17:00:00Z') }), order({ createdAt: new Date('2026-09-14T16:59:59Z') }), order({ createdAt: new Date('2026-08-01T00:00:00Z') })], now);
  assert.equal(stats.today.orders, 1);
  assert.equal(stats.last30Days.orders, 2);
  assert.equal(stats.allTime.orders, 3);
  assert.equal(stats.trend.length, 7);
  assert.equal(stats.trend[6].profit, 9);
});
test('discount allocation reconciles exactly to the cent across products', () => {
  const stats = calculateProfitStats([order({ total: 1.52, items: ['a', 'b', 'c'].map(productId => item({ productId, quantity: 1, price: 0.01, costPrice: 0 })) })], now);
  assert.equal(stats.allTime.revenue, 0.02);
  assert.equal(stats.topProducts.reduce((sum, product) => sum + Math.round(product.revenue * 100), 0), 2);
});
test('empty periods avoid NaN; customer responses omit cost snapshots', () => {
  assert.equal(calculateProfitStats([], now).today.profit, 0);
  assert.equal(calculateProfitStats([], now).today.margin, null);
  const clean = withoutOrderCosts(order());
  assert.equal('costPrice' in clean.items[0], false);
  assert.equal('costRecorded' in clean.items[0], false);
  assert.equal(clean.items[0].price, '10.00');
});

test('missing-cost products are complete, grouped, and scoped to the selected period', () => {
  const missing = item({ productId: 'missing', costPrice: null });
  const oldMissing = item({ productId: 'old-missing', costPrice: null, costRecorded: false, product: { name: 'Old Cream', sku: 'OLD', costPrice: null } });
  const stats = calculateProfitStats([
    ...Array.from({ length: 22 }, (_, i) => order({ items: [item({ productId: `seller-${i}`, quantity: 100 })] })),
    order({ items: [missing] }), order({ items: [missing] }),
    order({ createdAt: new Date('2026-08-01'), items: [oldMissing] }),
    order({ status: 'REFUNDED', items: [oldMissing] }),
    order({ status: 'CANCELLED', items: [oldMissing] }),
    order({ items: [item({ productId: 'free', costPrice: 0 })] }),
  ], now);
  assert.equal(stats.topProducts.some(product => product.productId === 'missing'), false);
  assert.deepEqual(stats.today.missingCostProducts, [{ productId: 'missing', name: 'Cream', sku: 'CRM', unitsWithoutCost: 4, savedSalesWithoutCost: 4 }]);
  assert.deepEqual(stats.last30Days.missingCostProducts, stats.today.missingCostProducts);
  assert.equal(stats.allTime.missingCostProducts.length, 2);
  assert.equal(stats.allTime.missingCostProducts[1].savedSalesWithoutCost, 0);
  assert.equal(stats.allTime.missingCostProducts.reduce((sum, product) => sum + product.unitsWithoutCost, 0), stats.allTime.unitsWithoutCost);
  assert.deepEqual(calculateProfitStats([], now).today.missingCostProducts, []);
});

test('estimated-cost product lists reconcile by period and exclude saved or unknown costs', () => {
  const legacy = item({ productId: 'legacy', costRecorded: false, costPrice: null });
  const stats = calculateProfitStats([
    ...Array.from({ length: 22 }, (_, i) => order({ items: [item({ productId: `seller-${i}`, quantity: 100 })] })),
    order({ items: [legacy] }), order({ items: [legacy] }),
    order({ createdAt: new Date('2026-08-01'), items: [legacy] }),
    order({ status: 'CANCELLED', items: [legacy] }),
    order({ status: 'REFUNDED', items: [legacy] }),
    order({ items: [item({ productId: 'unknown', costPrice: null, costRecorded: false, product: { name: 'Unknown', sku: 'UNK', costPrice: null } })] }),
    order({ items: [item({ productId: 'free', costRecorded: false, product: { name: 'Free', sku: 'FREE', costPrice: 0 } })] }),
  ], now);
  assert.equal(stats.topProducts.some(product => product.productId === 'legacy'), false);
  assert.deepEqual(stats.today.estimatedCostProducts[0], { productId: 'legacy', name: 'Cream', sku: 'CRM', estimatedUnits: 4, costPrice: 9 });
  assert.deepEqual(stats.today.estimatedCostProducts, stats.last30Days.estimatedCostProducts);
  assert.equal(stats.allTime.estimatedCostProducts[0].estimatedUnits, 6);
  assert.equal(stats.allTime.estimatedCostProducts[1].costPrice, 0);
  assert.equal(stats.allTime.estimatedCostProducts.length, 2);
  for (const period of [stats.today, stats.last30Days, stats.allTime]) {
    assert.equal(period.estimatedCostProducts.reduce((sum, product) => sum + product.estimatedUnits, 0), period.estimatedUnits);
  }
  assert.deepEqual(calculateProfitStats([], now).allTime.estimatedCostProducts, []);
});

test('custom date range buckets orders inclusively and is omitted without dates', () => {
  const inRange = order({ createdAt: new Date('2026-09-10T02:00:00Z') });
  const boundaryStart = order({ createdAt: new Date('2026-09-01T00:00:00Z') });
  const boundaryEnd = order({ createdAt: new Date('2026-09-15T04:59:59Z') });
  const outside = order({ createdAt: new Date('2026-08-31T23:59:59Z') });
  const stats = calculateProfitStats([
    inRange, inRange, boundaryStart, boundaryEnd, outside,
    order({ createdAt: new Date('2026-09-14T20:00:00Z'), status: 'CANCELLED' }),
  ], now, { from: new Date('2026-09-01'), to: new Date('2026-09-15') });
  assert.equal(stats.custom!.orders, 4);
  assert.equal(stats.custom!.revenue, 68);
  assert.equal(stats.custom!.profit, 36);
  assert.equal(stats.custom!.unitsSold, 8);
  assert.equal(stats.custom!.missingCostProducts.length, 0);
  assert.deepEqual(calculateProfitStats([inRange], now).custom, undefined);
});
