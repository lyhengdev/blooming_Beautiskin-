import { test, expect, Cookie } from '@playwright/test';
import sharp from 'sharp';
import { toBuffer } from 'bwip-js/node';
import { MultiFormatReader, RGBLuminanceSource, HybridBinarizer, BinaryBitmap } from '@zxing/library';

let cookies: Cookie[] = [];
test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  const response = await request.post('/api/auth/login', { data: { email: 'barcode@example.test', password: 'BarcodeDemo123!' } });
  expect(response.ok()).toBeTruthy();
  cookies = (await request.storageState()).cookies;
  await request.dispose();
});
test.beforeEach(async ({ context }) => { await context.addCookies(cookies); });

test('rapid scanner entry, variants, unknown code and mobile layout', async ({ page }, testInfo) => {
  await page.goto('/admin/online-selling');
  const scan = page.getByRole('textbox', { name: 'Barcode', exact: true });
  await expect(scan).toBeVisible();
  for (let index = 0; index < 10; index++) {
    await scan.fill('BBS-DEMO-CLEANSER');
    await scan.press('Enter');
  }
  await expect(page.getByRole('status')).toContainText('quantity 10');
  await scan.fill('0036000291452');
  await scan.press('Enter');
  await expect(page.getByRole('status')).toContainText('30 ml');
  await scan.fill('BBS-DEMO-SERUM-60');
  await scan.press('Enter');
  await expect(page.getByRole('status')).toContainText('60 ml');
  await expect(page.getByRole('heading', { name: 'Cart (3)' })).toBeVisible();
  await scan.fill('BBS-UNKNOWN-DEMO');
  await scan.press('Enter');
  await expect(page.getByRole('link', { name: 'Create product', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cart (3)' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('barcode-selling.png'), fullPage: true });
});

test('product barcode assignment, duplicate feedback, saved label rendering', async ({ page }, testInfo) => {
  const products = await page.request.get('/api/products/admin?search=BARCODE-DEMO-CLEANSER');
  const product = (await products.json()).data.products[0];
  await page.goto(`/admin/products?edit=${product.id}`);
  await expect(page.getByRole('heading', { name: 'Edit Product' })).toBeVisible();
  const scan = page.getByRole('textbox', { name: 'Barcode', exact: true });
  await scan.fill('036000291452');
  await scan.press('Enter');
  await expect(page.getByRole('status')).toContainText('Already assigned');
  await expect(page.getByRole('heading', { name: 'Edit Product' })).toBeVisible();
  await page.getByRole('button', { name: 'Print BBS-DEMO-CLEANSER', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Print', exact: true })).toBeEnabled();
  const label = page.getByRole('img', { name: 'BBS-DEMO-CLEANSER', exact: true });
  await expect(label).toBeVisible();
  expect(await label.evaluate((img: HTMLImageElement) => img.naturalWidth > 100 && img.naturalHeight > 30)).toBeTruthy();
  const src = await label.getAttribute('src');
  const { data, info } = await sharp(Buffer.from(src!.split(',')[1], 'base64')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Int32Array(info.width * info.height);
  for (let at = 0; at < pixels.length; at++) pixels[at] = (data[at * 4] << 16) | (data[at * 4 + 1] << 8) | data[at * 4 + 2];
  const decoded = new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels, info.width, info.height))), new Map());
  expect(decoded.getText()).toBe('BBS-DEMO-CLEANSER');
  await page.screenshot({ path: testInfo.outputPath('barcode-labels.png'), fullPage: true });
});

test('camera failure leaves manual scanning available', async ({ page }) => {
  await page.goto('/admin/online-selling');
  await page.getByRole('button', { name: 'Scan with camera' }).click();
  await expect(page.getByRole('status')).not.toHaveText('Ready', { timeout: 20000 });
  await expect(page.getByRole('textbox', { name: 'Barcode', exact: true })).toBeEnabled();
});

test('camera decodes one item per opening and releases its media tracks', async ({ page }) => {
  const png = await toBuffer({ bcid: 'code128', text: 'BBS-DEMO-CLEANSER', scale: 3, height: 15, padding: 20, backgroundcolor: 'FFFFFF' });
  await page.addInitScript((dataUrl) => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000; canvas.height = 600;
      const ctx = canvas.getContext('2d')!;
      const image = new Image(); image.src = dataUrl; await image.decode();
      const draw = () => { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1000, 600); ctx.drawImage(image, (1000 - image.width) / 2, (600 - image.height) / 2); };
      draw();
      const stream = canvas.captureStream(10);
      const timer = setInterval(draw, 100);
      const win = window as typeof window & { barcodeTestStream?: MediaStream; barcodeTestTimer?: ReturnType<typeof setInterval> };
      if (win.barcodeTestTimer) clearInterval(win.barcodeTestTimer);
      win.barcodeTestStream = stream; win.barcodeTestTimer = timer;
      return stream;
    } });
  }, `data:image/png;base64,${png.toString('base64')}`);
  await page.goto('/admin/online-selling');
  await page.getByRole('button', { name: 'Scan with camera' }).click();
  await expect(page.getByRole('status')).toContainText('quantity 1', { timeout: 20000 });
  await expect(page.getByRole('dialog', { name: 'Scan barcode', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as typeof window & { barcodeTestStream?: MediaStream }).barcodeTestStream?.getTracks().every((track) => track.readyState === 'ended'))).toBeTruthy();
  await page.getByRole('button', { name: 'Scan with camera' }).click();
  await expect(page.getByRole('status')).toContainText('quantity 2', { timeout: 20000 });
});

test('scan a new product, save it, then resolve it in selling', async ({ page }) => {
  const code = `BBS-UI-${Date.now()}`;
  let id = '';
  try {
    await page.goto(`/admin/products?barcode=${code}`);
    await expect(page.getByRole('heading', { name: 'Add Product', exact: true })).toBeVisible();
    await page.getByPlaceholder('Product name', { exact: true }).fill(code);
    await page.getByPlaceholder('e.g. COSRX-001').fill(code);
    await page.getByPlaceholder('0.00', { exact: true }).fill('5.50');
    await page.locator('form select').filter({ has: page.locator('option[value=""]', { hasText: 'Select category...' }) }).selectOption({ label: 'Skincare Demo' });
    await page.locator('form select').filter({ has: page.locator('option[value=""]', { hasText: 'Select brand...' }) }).selectOption({ label: 'Barcode Demo' });
    const saved = page.waitForResponse((response) => response.url().endsWith('/api/products/admin') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save Product', exact: true }).click();
    const response = await saved;
    expect(response.status()).toBe(201);
    id = (await response.json()).data.product.id;
    await page.goto('/admin/online-selling');
    const scan = page.getByRole('textbox', { name: 'Barcode', exact: true });
    await scan.fill(code); await scan.press('Enter');
    await expect(page.getByRole('status')).toContainText(`Added ${code}`);
  } finally { if (id) await page.request.delete(`/api/products/admin/${id}`); }
});
