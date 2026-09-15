import { test, expect } from '@playwright/test';
import { SignJWT } from 'jose';
import { readFileSync } from 'node:fs';

// Use the local preview's signing key only to pass middleware; API responses are fixtures.
const env = readFileSync('.env.local', 'utf8');
const secret = env.match(/^JWT_SECRET\s*=\s*["']?([^"'\r\n]+)/m)?.[1];

test('manual discount updates totals, validates, confirms, submits and resets', async ({ context, page }, testInfo) => {
  if (!secret) throw new Error('Local preview requires JWT_SECRET');
  const token = await new SignJWT({ id: 'discount-preview', role: 'ADMIN' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(secret));
  await context.addCookies([{ name: 'token', value: token, domain: 'localhost', path: '/' }]);
  let submitted: { discount: number; deliveryFee: number } | undefined;
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {};
    if (path.endsWith('/auth/me')) data = { user: { id: 'discount-preview', name: 'Admin', role: 'ADMIN' } };
    if (path.endsWith('/products/admin')) data = { products: [{ id: 'cream', name: 'Discount Test Cream', slug: 'cream', sku: 'CRM', price: '20', stock: 10, trackStock: false, isActive: true, images: [], variants: [] }], pagination: { page: 1, total: 1, totalPages: 1 } };
    if (path.endsWith('/orders/admin/create')) { submitted = route.request().postDataJSON(); data = { order: { id: 'discount-order' } }; }
    await route.fulfill({ json: { status: 'success', data } });
  });
  await page.goto('/admin/online-selling');
  const discount = page.getByRole('spinbutton', { name: 'Discount ($)', exact: true });
  await expect(discount).toHaveValue('0');
  await page.getByRole('button', { name: /Discount Test Cream/ }).click();
  await discount.fill('5.25');
  await expect(page.getByText('$16.25', { exact: true }).first()).toBeVisible();
  await page.getByPlaceholder('Full name *', { exact: true }).fill('Discount Customer');
  await page.getByPlaceholder('Phone *', { exact: true }).fill('010000000');
  await page.getByPlaceholder('Address *', { exact: true }).fill('Test Street');
  await page.getByPlaceholder('City *', { exact: true }).fill('Phnom Penh');
  await page.locator('select').filter({ has: page.locator('option', { hasText: 'Province *' }) }).selectOption('Phnom Penh');
  const confirm = page.getByRole('button', { name: 'Confirm & Send to Telegram' });
  await discount.fill('21');
  await expect(page.getByRole('alert').filter({ hasText: 'Discount cannot exceed' })).toBeVisible();
  await expect(confirm).toBeDisabled();
  await discount.fill('-1');
  await expect(discount).toHaveAttribute('aria-invalid', 'true');
  await discount.fill('5.25');
  await confirm.click();
  await expect(page.getByText('−$5.25', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('discount-confirmation.png'), fullPage: true });
  await page.getByRole('button', { name: 'Confirm Order', exact: true }).click();
  await expect(discount).toHaveValue('0');
  expect(submitted?.discount).toBe(5.25);
  expect(submitted?.deliveryFee).toBe(1.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
