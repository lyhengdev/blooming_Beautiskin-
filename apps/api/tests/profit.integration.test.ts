import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import express from 'express';

const url = new URL(process.env.DATABASE_URL || 'postgresql://localhost/invalid');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test')) throw new Error('Tests require an isolated localhost database ending in _test');
process.env.JWT_SECRET = 'barcode-local-test-secret-not-for-production';
process.env.TELEGRAM_BOT_TOKEN = '';
process.env.TELEGRAM_CHAT_ID = '';

let server: Server;
let base = '';
let token = '';
let customerToken = '';
let brandId = '';
let categoryId = '';
let userId = '';
const prefix = `profit-test-${randomUUID()}`;
let prisma: (typeof import('../src/lib/prisma'))['prisma'];

before(async () => {
  prisma = (await import('../src/lib/prisma')).prisma;
  const { generateToken } = await import('../src/middlewares/auth');
  const user = await prisma.user.create({ data: { name: prefix, email: `${prefix}@example.test`, password: 'unused-test-password', role: 'ADMIN' } });
  userId = user.id;
  token = generateToken(user);
  customerToken = generateToken({ ...user, role: 'CUSTOMER' });
  brandId = (await prisma.brand.create({ data: { name: prefix, slug: prefix } })).id;
  categoryId = (await prisma.category.create({ data: { name: prefix, slug: prefix } })).id;
  const app = express();
  app.use(express.json());
  app.use('/products', (await import('../src/routes/product.routes')).default);
  app.use('/admin', (await import('../src/routes/admin.routes')).default);
  app.use('/orders', (await import('../src/routes/order.routes')).default);
  app.use((await import('../src/middlewares/errorHandler')).errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No server address');
  base = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  if (prisma && userId) {
    await prisma.payment.deleteMany({ where: { order: { userId } } });
    await prisma.orderItem.deleteMany({ where: { order: { userId } } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.product.deleteMany({ where: { brandId } });
    await prisma.brand.delete({ where: { id: brandId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.user.delete({ where: { id: userId } });
  }
  await prisma?.$disconnect();
});

async function request(path: string, method = 'GET', body?: unknown, key?: string, auth = token) {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}`, ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json(), cache: response.headers.get('Cache-Control') };
}


test('saved sale costs survive edits, admin analytics resolve, and guest tracking hides snapshots', async () => {
  const product = await prisma.product.create({ data: {
    name: prefix, slug: prefix, sku: prefix, brandId, categoryId, price: 10, costPrice: 4,
  } });
  const response = await request('/orders/admin/create', 'POST', {
    shippingName: 'Profit Test', shippingPhone: '010000000', shippingAddress: 'Test Street',
    shippingCity: 'Test City', shippingProvince: 'Phnom Penh', paymentMethod: 'CASH_ON_DELIVERY',
    deliveryFee: 1.5, items: [{ productId: product.id, quantity: 2 }],
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const sale = response.body.data.order;
  assert.equal(sale.items[0].costPrice, '4');
  assert.equal(sale.items[0].costRecorded, true);
  await prisma.product.update({ where: { id: product.id }, data: { costPrice: 9, isActive: false } });
  const stats = await request('/admin/profit-stats');
  assert.equal(stats.status, 200, JSON.stringify(stats.body));
  const top = stats.body.data.topProducts.find((entry: { productId: string }) => entry.productId === product.id);
  assert.equal(top.profit, 12);
  assert.equal(top.revenue, 20);
  assert.equal(top.cost, 8);
  assert.equal(top.name, prefix);
  assert.equal(stats.cache, 'no-store');
  assert.equal((await request('/admin/profit-stats', 'GET', undefined, undefined, customerToken)).status, 403);
  const tracked = await request('/orders/track', 'POST', { orderNumber: sale.orderNumber, phone: '010000000' }, undefined, '');
  assert.equal(tracked.status, 200, JSON.stringify(tracked.body));
  assert.equal('costPrice' in tracked.body.data.order.items[0], false);
  assert.equal('costRecorded' in tracked.body.data.order.items[0], false);
});

test('manual discount defaults to zero, saves cents, updates payment and profit, and retries once', async () => {
  const product = await prisma.product.create({ data: { name: `${prefix}-discount`, slug: `${prefix}-discount`, sku: `${prefix}-discount`, brandId, categoryId, price: 10, costPrice: 4 } });
  const payload = { shippingName: 'Discount Test', shippingPhone: '010000000', shippingAddress: 'Test Street', shippingCity: 'Test City', shippingProvince: 'Phnom Penh', paymentMethod: 'CASH_ON_DELIVERY', deliveryFee: 1.5, items: [{ productId: product.id, quantity: 2 }] };
  const plain = await request('/orders/admin/create', 'POST', payload);
  assert.equal(plain.status, 201);
  assert.equal(Number(plain.body.data.order.discount), 0);
  assert.equal(Number(plain.body.data.order.total), 21.5);
  const key = randomUUID();
  const discounted = await request('/orders/admin/create', 'POST', { ...payload, discount: 5.25 }, key);
  assert.equal(discounted.status, 201, JSON.stringify(discounted.body));
  const saved = discounted.body.data.order;
  assert.equal(Number(saved.discount), 5.25);
  assert.equal(Number(saved.total), 16.25);
  assert.equal(Number(saved.payment.amount), 16.25);
  const retry = await request('/orders/admin/create', 'POST', { ...payload, discount: 5.25 }, key);
  assert.equal(retry.body.data.order.id, saved.id);
  const stats = await request('/admin/profit-stats');
  const result = stats.body.data.topProducts.find((entry: { productId: string }) => entry.productId === product.id);
  assert.equal(result.revenue, 34.75);
  assert.equal(result.profit, 18.75);
  const free = await request('/orders/admin/create', 'POST', { ...payload, discount: 20 });
  assert.equal(free.status, 201);
  assert.equal(Number(free.body.data.order.total), 1.5);
});

test('invalid manual discounts cannot create orders, consume stock, or combine with coupons', async () => {
  const product = await prisma.product.create({ data: { name: `${prefix}-invalid`, slug: `${prefix}-invalid`, sku: `${prefix}-invalid`, brandId, categoryId, price: 10, stock: 5, trackStock: true } });
  const payload = { shippingName: 'Discount Test', shippingPhone: '010000000', shippingAddress: 'Test Street', shippingCity: 'Test City', shippingProvince: 'Phnom Penh', items: [{ productId: product.id, quantity: 1 }] };
  for (const discount of [-1, 10.01, 0.001, 'invalid', null, 100000000]) {
    const response = await request('/orders/admin/create', 'POST', { ...payload, discount });
    assert.equal(response.status, 400, `discount=${discount}: ${JSON.stringify(response.body)}`);
  }
  const combined = await request('/orders/admin/create', 'POST', { ...payload, discount: 1, couponCode: 'EXAMPLE' });
  assert.equal(combined.status, 400);
  assert.match(combined.body.message, /either a manual discount or a coupon/);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 5);
  assert.equal(await prisma.orderItem.count({ where: { productId: product.id } }), 0);
});
