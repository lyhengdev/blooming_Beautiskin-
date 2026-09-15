import { test, expect } from '@playwright/test';
import { SignJWT } from 'jose';
import { readFileSync } from 'node:fs';

// Use the local preview's signing key only to pass middleware; API responses are fixtures.
const env = readFileSync('.env.local', 'utf8');
const secret = env.match(/^JWT_SECRET\s*=\s*["']?([^"'\r\n]+)/m)?.[1];
const summary = { revenue: 200, cost: 80, profit: 120, margin: 60, unitsSold: 20, unitsWithoutCost: 0, estimatedUnits: 0, orders: 10 };
const stats = {
  today: { ...summary, revenue: 20, cost: 8, profit: 12, orders: 1, unitsSold: 2 },
  last30Days: summary, allTime: { ...summary, profit: null, unitsWithoutCost: 2, estimatedUnits: 4, estimatedCostProducts: [{ productId: 'legacy-cream', name: 'Older Sale Cream', sku: 'OLD-001', estimatedUnits: 4, costPrice: 7.5 }], missingCostProducts: [{ productId: 'missing-cream', name: 'Missing Cost Moisturizer', sku: 'MISSING-001', unitsWithoutCost: 2, savedSalesWithoutCost: 0 }] },
  trend: Array.from({ length: 7 }, (_, i) => ({ ...summary, date: `2026-09-${String(9 + i).padStart(2, '0')}`, profit: i === 0 ? -12 : 12 })),
  topProducts: [{ ...summary, productId: 'cream', name: 'Blooming Daily Moisturizer', sku: 'CRM' }],
  totalProducts: 10, totalProductsWithCost: 8,
};
test.beforeEach(async ({ context, page }) => {
  if (!secret) throw new Error('Local preview requires JWT_SECRET in .env.local');
  const token = await new SignJWT({ id: 'profit-preview', role: 'ADMIN' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(secret));
  await context.addCookies([{ name: 'token', value: token, domain: 'localhost', path: '/' }]);
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    let data: unknown = {};
    if (url.pathname.endsWith('/auth/me')) data = { user: { id: 'profit-preview', name: 'Store Admin', email: 'preview@example.test', role: 'ADMIN' } };
    if (url.pathname.endsWith('/admin/profit-stats')) data = stats;
    if (url.pathname.endsWith('/admin/stats')) data = { totalRevenue: 220, revenueLast30d: 220, pendingOrders: 2, totalOrders: 10, totalCustomers: 5, newCustomers30d: 1, totalProducts: 10, lowStockProducts: 0, recentOrders: [], revenueTrend: [] };
    await route.fulfill({ json: { status: 'success', data } });
  });
});
test('profit periods, missing-cost feedback, and responsive layout', async ({ page }, testInfo) => {
  await page.goto('/admin');
  const section = page.getByRole('region', { name: 'Profit overview' });
  await expect(section).toBeVisible();
  await expect(section.getByText('$120.00', { exact: true }).first()).toBeVisible();
  await section.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(section.getByText('1 orders · 2 units sold')).toBeVisible();
  await section.getByRole('button', { name: 'All time', exact: true }).click();
  await expect(section.getByText('Incomplete', { exact: true })).toBeVisible();
  await expect(section.getByRole('status')).toContainText('2 sold units');
  const missingProducts = section.getByRole('list', { name: 'Products missing cost' });
  await expect(missingProducts.getByText('Missing Cost Moisturizer', { exact: true })).toBeVisible();
  await expect(missingProducts).toContainText('MISSING-001');
  await expect(missingProducts.getByRole('link', { name: 'Edit cost for Missing Cost Moisturizer' })).toHaveAttribute('href', '/admin/products?edit=missing-cream');
  const estimatedProducts = section.getByRole('list', { name: 'Products using estimated costs' });
  await expect(estimatedProducts).not.toBeVisible();
  await section.locator('summary').filter({ hasText: 'View products (1)' }).click();
  await expect(estimatedProducts.getByText('Older Sale Cream', { exact: true })).toBeVisible();
  await expect(estimatedProducts).toContainText('OLD-001 · 4 units');
  await expect(estimatedProducts).toContainText('$7.50 per unit');
  await expect(estimatedProducts.getByRole('link', { name: 'Review cost for Older Sale Cream' })).toHaveAttribute('href', '/admin/products?edit=legacy-cream');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('missing-product-costs.png'), fullPage: true });
  await section.getByRole('button', { name: 'Last 30 days', exact: true }).click();
  await expect(missingProducts).toHaveCount(0);
  await expect(estimatedProducts).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('profit-dashboard.png'), fullPage: true });
});
test('failed request stays visible and can be retried', async ({ page }) => {
  let failing = true;
  await page.route('**/api/admin/profit-stats', route => route.fulfill(failing ? { status: 500, json: { message: 'test error' } } : { json: { status: 'success', data: stats } }));
  await page.goto('/admin');
  await expect(page.getByRole('alert').filter({ hasText: 'Couldn’t load profit' })).toBeVisible({ timeout: 30000 });
  failing = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('Product sales', { exact: true })).toBeVisible();
});
