import type { Browser, Page } from 'puppeteer';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { getReceiptConfig } from './receiptConfig';

// DOM globals used only inside page.evaluate callbacks (run in the browser).
declare const document: any;

// ─────────────────────────────────────────────────────────────────────────────
//  Blooming Beauty Skin — DELIVERY INVOICE (Thermal Receipt)
//  Rendered with Puppeteer (real Chrome) from an HTML + CSS template.
//  Default width 58mm @ 203 DPI = 384px. Monochrome (black on white).
//  Configurable paper size via RECEIPT_WIDTH (58mm | 80mm | <custom px>).
// ─────────────────────────────────────────────────────────────────────────────

export type InvoiceItem = { name: string; quantity: number; price: number };

export type InvoiceData = {
  orderNumber: string;
  total: number;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  notes: string | null;
  paymentMethod: string;
  createdAt: Date;
  items: InvoiceItem[];
};

const PAYMENT_LABELS: Record<string, string> = {
  ABA_PAY: 'ABA Pay',
  WING: 'Wing Money',
  CREDIT_CARD: 'Credit / Debit Card',
  CASH_ON_DELIVERY: 'Cash on Delivery',
};

export function formatDate(d: Date): string {
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(',', '  ·  ');
}

export function formatOrderNumber(n: string): string {
  return n;
}

function formatDateShort(d: Date): string {
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const fmt = (n: number) => `$${n.toFixed(2)}`;

// ── Logo ────────────────────────────────────────────────────────────────────
const LOGO_CANDIDATES = [
  process.env.LOGO_PATH,
  join(resolve(__dirname), '../../../apps/web/public/logo.png'),
  join(resolve(__dirname), '../web/public/logo.png'),
  '/Users/p-lyheng/Documents/MyCode/Project2K26/Blooming_Beauty_Skin/apps/web/public/logo.png',
].filter(Boolean) as string[];

function findLogo(): string | null {
  for (const p of LOGO_CANDIDATES) if (existsSync(p)) return p;
  return null;
}

// ── Browser pool (single reusable Chromium instance) ────────────────────────
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const puppeteer = await import('puppeteer');
      return puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    })().catch((err) => {
      browserPromise = null; // allow retry on next call
      throw err;
    });
  }
  return browserPromise;
}

// ── HTML template ───────────────────────────────────────────────────────────
function buildHtml(
  data: InvoiceData,
  logoDataUri: string | null,
  widthPx: number,
): string {
  const phone = data.shippingPhone.startsWith('+')
    ? data.shippingPhone
    : `+${data.shippingPhone}`;
  const addrText = `${data.shippingAddress}, ${data.shippingCity}, ${data.shippingProvince}`;

  const subtotal = data.items.reduce(
    (a, it) => a + Number(it.price) * it.quantity,
    0,
  );
  const delivery = Number((data.total - subtotal).toFixed(2));

  const itemsHtml = data.items
    .map(
      (it) => `
        <div class="item">
          <div class="item-name">${escapeHtml(it.name)}</div>
          <div class="item-line">
            <span class="item-qty">${it.quantity} × ${fmt(Number(it.price))}</span>
            <span class="item-total">${fmt(Number(it.price) * it.quantity)}</span>
          </div>
        </div>`,
    )
    .join('');

  const logoHtml = logoDataUri
    ? `<img class="logo" src="${logoDataUri}" alt="logo"/>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  html, body { margin: 0; padding: 0; width: ${widthPx}px; }
  body {
    background: #ffffff;
    color: #000000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  * { box-sizing: border-box; }
  .receipt { padding: 6px 10px 14px; width: 100%; overflow-wrap: break-word; word-break: break-word; }
  .logo { display: block; width: 26px; height: 26px; object-fit: contain; margin: 0 auto 6px; }
  .center { text-align: center; }
  .mut { color: #555555; }
  .brand { font-weight: 700; font-size: 15px; letter-spacing: 0.4px; }
  .tagline { font-size: 10px; color: #555555; margin-top: 1px; }
  .title { font-weight: 600; font-size: 10px; margin-top: 9px; }
  .meta { font-size: 10px; color: #555555; margin-top: 1px; }
  .dash { border: 0; border-top: 1px dashed #bbbbbb; margin: 8px 0; }
  .solid { border: 0; border-top: 1px solid #000000; margin: 8px 0; }
  .section { font-weight: 600; font-size: 10px; color: #555555; }
  .customer-name { font-weight: 700; font-size: 15px; margin-top: 1px; }
  .customer-line { font-size: 12px; margin-top: 1px; }
  .item { margin-top: 8px; }
  .item-name { font-weight: 600; font-size: 12px; }
  .item-line { font-size: 12px; margin-top: 1px; display: flex; justify-content: space-between; }
  .item-qty { color: #555555; }
  .item-total { font-weight: 600; color: #000000; }
  .summary { display: flex; justify-content: space-between; font-size: 12px; margin-top: 1px; }
  .summary .k { color: #555555; }
  .total-row { display: flex; justify-content: space-between; font-weight: 700; font-size: 15px; }
  .ref { display: flex; justify-content: space-between; font-size: 12px; }
  .ref .k { color: #555555; }
  .note-label { font-size: 12px; color: #555555; margin-top: 8px; }
  .note { font-size: 12px; margin-top: 1px; }
  .thanks { text-align: center; font-weight: 600; font-size: 12px; margin-top: 8px; }
  .contact { text-align: center; font-size: 10px; color: #555555; margin-top: 1px; }
</style>
</head>
<body>
  <div class="receipt">
    ${logoHtml}
    <div class="center brand">BLOOMING BEAUTY</div>
    <div class="center tagline">SKIN · SKINCARE</div>
    <div class="center title">DELIVERY INVOICE</div>
    <div class="center meta">${formatOrderNumber(data.orderNumber)}</div>
    <div class="center meta">${formatDateShort(data.createdAt)}</div>

    <hr class="dash"/>
    <div class="section">SHIP TO</div>
    <div class="customer-name">${escapeHtml(data.shippingName)}</div>
    <div class="customer-line">${escapeHtml(addrText)}</div>
    <div class="customer-line">${escapeHtml(phone)}</div>

    <hr class="dash"/>
    <div class="section">ITEMS</div>
    <hr class="solid"/>
    ${itemsHtml}

    <hr class="dash"/>
    <div class="summary"><span class="k">Subtotal</span><span>${fmt(subtotal)}</span></div>
    <div class="summary"><span class="k">Delivery</span><span>${fmt(delivery)}</span></div>
    <hr class="solid"/>
    <div class="total-row"><span>TOTAL</span><span>${fmt(data.total)}</span></div>
    <hr class="dash"/>
    <div class="ref"><span class="k">Payment</span><span>${PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod}</span></div>

    ${data.notes ? `<div class="note-label">Note</div><div class="note">${escapeHtml(data.notes)}</div>` : ''}

    <hr class="dash"/>
    <div class="thanks">Thank you for shopping<br/>with Blooming Beauty!</div>
    <div class="contact">hello@bloomingbeautyskin.com</div>
    <div class="contact">bloomingbeautyskin.com</div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface RenderedInvoice {
  toBuffer(format?: string): Promise<Buffer>;
  width: number;
  height: number;
}

// ── Main render ─────────────────────────────────────────────────────────────
export async function renderInvoice(data: InvoiceData): Promise<RenderedInvoice> {
  const cfg = getReceiptConfig();

  const logoPath = findLogo();
  const logoDataUri = logoPath
    ? 'data:image/png;base64,' + readFileSync(logoPath).toString('base64')
    : null;

  const html = buildHtml(data, logoDataUri, cfg.widthPx);

  const browser = await getBrowser();
  const page: Page = await browser.newPage();
  try {
    // Keep the layout in logical pixels; render at a higher pixel density
    // (deviceScaleFactor) so the output PNG is high-resolution and sharp.
    await page.setViewport({
      width: cfg.widthPx,
      height: 600,
      deviceScaleFactor: cfg.renderScale,
    });
    await page.setContent(html, { waitUntil: 'load' });

    await page.evaluate(() => {
      (document as any).fonts?.ready?.catch(() => undefined);
    });

    const dims = await page.evaluate(() => ({
      width: Math.max(1, Math.ceil((document as any).body.scrollWidth)),
      height: Math.max(1, Math.ceil((document as any).body.scrollHeight)),
    }));

    // Clip in logical units (multiplied by deviceScaleFactor automatically).
    const captureW = Math.min(cfg.widthPx, dims.width);
    const raw = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: captureW, height: dims.height },
    });
    const buffer = Buffer.from(raw);

    return {
      toBuffer: async () => buffer,
      width: Math.round(captureW * cfg.renderScale),
      height: Math.round(dims.height * cfg.renderScale),
    };
  } finally {
    await page.close();
  }
}

// ── Optional: warm up / dispose browser ─────────────────────────────────────
export async function closeRenderer(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}
