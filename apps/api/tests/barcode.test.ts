import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import express from 'express';
import { normalizeBarcode } from '../src/lib/barcode';
import { addSaleItem, linePrice, SaleLine, SaleProduct } from '../../web/src/lib/saleCart';

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
const prefix = `barcode-test-${randomUUID()}`;
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

function gtin12(seed: number): string {
  const base = String(seed).padStart(11, '0').slice(-11);
  let sum = 0;
  for (let i = 0; i < 11; i++) sum += Number(base[i]) * (i % 2 === 0 ? 3 : 1);
  return base + String((10 - (sum % 10)) % 10);
}
const upc = gtin12(Number(prefix.replace(/[^0-9]/g, '').slice(0, 11)));

async function product(extra: Record<string, unknown> = {}) {
  const id = randomUUID();
  const response = await request('/products/admin', 'POST', { name: `${prefix}-${id}`, sku: `${prefix}-${id}`, price: 12.5, stock: 20, trackStock: true, brandId, categoryId, ...extra });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body.data.product;
}
function sale(productId: string, variantId?: string, quantity = 1) {
  return { shippingName: 'Barcode Test', shippingPhone: '010000000', shippingAddress: 'Test Street', shippingCity: 'Test City', shippingProvince: 'Phnom Penh', paymentMethod: 'CASH_ON_DELIVERY', deliveryFee: 0, items: [{ productId, variantId, quantity }] };
}

test('GTIN equivalence, leading zeros, explicit Code 128, and invalid input', () => {
  assert.equal(normalizeBarcode('036000291452').normalizedValue, normalizeBarcode('0036000291452').normalizedValue);
  assert.equal(normalizeBarcode('036000291452\r\n').value, '036000291452');
  assert.equal(normalizeBarcode('12345678', 'CODE_128').normalizedValue, 'CODE:12345678');
  assert.throws(() => normalizeBarcode('036000291453'), /check digit/);
  assert.throws(() => normalizeBarcode('A\u0000B'), /printable/);
  assert.throws(() => normalizeBarcode('123', 'EAN_13'), /length/);
});

test('rapid intentional scans count exactly; variants and stock stay separate', () => {
  const variants = [{ id: 'small', name: '30 ml', price: '10', stock: 10 }, { id: 'large', name: '60 ml', price: '18', stock: 2 }];
  const item: SaleProduct = { id: 'cream', name: 'Cream', slug: 'cream', price: '10', stock: 0, trackStock: true, isActive: true, images: [], variants };
  let cart: SaleLine[] = [];
  for (let i = 0; i < 10; i++) cart = addSaleItem(cart, item, variants[0]);
  cart = addSaleItem(cart, item, variants[1]);
  assert.deepEqual(cart.map((line) => line.qty), [10, 1]);
  assert.equal(linePrice(cart[1]), 18);
  assert.throws(() => addSaleItem(cart, item, variants[0]), /stock/);
  assert.throws(() => addSaleItem([], item), /variant/);
  assert.throws(() => addSaleItem([], { ...item, isActive: false }, variants[0]), /inactive/);
});

test('exact lookup returns variant across UPC/EAN representations and protects admin access', async () => {
  const item = await product({ variants: [{ name: '30 ml', price: 9, stock: 5, barcodes: [{ value: upc }] }] });
  const response = await request(`/products/admin/barcode-lookup?code=${upc.padStart(13, '0')}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.variant.id, item.variants[0].id);
  assert.equal(response.cache, 'no-store');
  assert.equal((await request(`/products/admin/barcode-lookup?code=${upc}`)).status, 200);
  assert.equal((await request(`/products/admin/barcode-lookup?code=${upc}`, 'GET', undefined, undefined, customerToken)).status, 403);
  assert.equal((await request('/products/admin/barcode-lookup?code=BBS-unknown')).status, 404);
});

test('variant edit preserves IDs and barcode links; referenced deletion rolls back images', async () => {
  const code = `BBS-${randomUUID()}`;
  const item = await product({ images: [{ url: '/original.png' }], variants: [{ name: 'Original', price: 8, stock: 5, barcodes: [{ value: code }] }] });
  const variant = item.variants[0];
  const updated = await request(`/products/admin/${item.id}`, 'PUT', { variants: [{ id: variant.id, name: 'Renamed', price: 9, stock: 5 }] });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  const found = await request(`/products/admin/barcode-lookup?code=${code}`);
  assert.equal(found.body.data.variant.id, variant.id);
  assert.equal(found.body.data.variant.name, 'Renamed');
  assert.equal((await request('/orders/admin/create', 'POST', sale(item.id, variant.id), randomUUID())).status, 201);
  const rejected = await request(`/products/admin/${item.id}`, 'PUT', { images: [{ url: '/replacement.png' }], variants: [] });
  assert.equal(rejected.status, 409);
  const original = await prisma.productImage.findFirstOrThrow({ where: { productId: item.id } });
  assert.equal(original.url, '/original.png');
});

test('simultaneous barcode assignment has one winner and rolls back the losing product', async () => {
  const code = `BBS-${randomUUID()}`;
  const responses = await Promise.all([1, 2].map((at) => request('/products/admin', 'POST', { name: `${prefix}-duplicate-${at}`, sku: `${prefix}-duplicate-${at}`, price: 4, brandId, categoryId, barcodes: [{ value: code }] })));
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
  assert.equal(await prisma.product.count({ where: { sku: { startsWith: `${prefix}-duplicate-` } } }), 1);
});

test('order retries return one sale and stock is decremented once', async () => {
  const item = await product({ stock: 2 });
  const key = randomUUID();
  const payload = sale(item.id, undefined, 2);
  const results = await Promise.all([request('/orders/admin/create', 'POST', payload, key), request('/orders/admin/create', 'POST', payload, key)]);
  assert.deepEqual(results.map((response) => response.status).sort(), [200, 201]);
  assert.equal(results[0].body.data.order.id, results[1].body.data.order.id);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: item.id } })).stock, 0);
  const different = await request('/orders/admin/create', 'POST', sale(item.id), key);
  assert.equal(different.status, 409);
});

test('concurrent last-unit sales never oversell', async () => {
  const item = await product({ stock: 1 });
  const results = await Promise.all([request('/orders/admin/create', 'POST', sale(item.id), randomUUID()), request('/orders/admin/create', 'POST', sale(item.id), randomUUID())]);
  assert.deepEqual(results.map((response) => response.status).sort(), [201, 400]);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: item.id } })).stock, 0);
});

test('invalid quantities and stale prices cannot finalize a sale', async () => {
  const item = await product();
  assert.equal((await request('/orders/admin/create', 'POST', sale(item.id, undefined, -1))).status, 400);
  assert.equal((await request('/orders/admin/create', 'POST', sale(item.id, undefined, 1.5))).status, 400);
  const payload = { ...sale(item.id), items: [{ productId: item.id, quantity: 1, expectedPrice: 1 }] };
  assert.equal((await request('/orders/admin/create', 'POST', payload, randomUUID())).status, 409);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: item.id } })).stock, 20);
});

test('internal barcode generation is stable across concurrent retries', async () => {
  const item = await product();
  const responses = await Promise.all([request(`/products/admin/${item.id}/barcodes/generate`, 'POST', {}), request(`/products/admin/${item.id}/barcodes/generate`, 'POST', {})]);
  assert.equal(responses[0].status, 200);
  assert.equal(responses[0].body.data.barcode.value, responses[1].body.data.barcode.value);
});
