import axios from 'axios';
import { prisma } from './prisma';
import { renderInvoice } from './invoiceImage';
import FormData from 'form-data';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ── Send message ─────────────────────────────────────────────────────────────

export async function sendTelegramMessage(
  text: string,
  chatId?: string,
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Telegram bot token not configured — skipping');
    return false;
  }

  const targetChat = chatId || TELEGRAM_CHAT_ID;
  if (!targetChat) {
    console.warn('Telegram chat ID not configured — skipping');
    return false;
  }

  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      { chat_id: targetChat, text, parse_mode: 'HTML' },
      { timeout: 10_000 },
    );
    return true;
  } catch (err: any) {
    console.error('Telegram send failed:', err?.response?.data || err.message);
    return false;
  }
}

// ── Send photo (PNG image buffer) ────────────────────────────────────────────

export async function sendTelegramPhoto(
  pngBuffer: Buffer,
  caption: string,
  chatId?: string,
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Telegram bot token not configured — skipping photo');
    return false;
  }

  const targetChat = chatId || TELEGRAM_CHAT_ID;
  if (!targetChat) {
    console.warn('Telegram chat ID not configured — skipping photo');
    return false;
  }

  try {
    const form = new FormData();
    form.append('chat_id', targetChat);
    form.append('photo', pngBuffer, { filename: 'invoice.png', contentType: 'image/png' });
    // Telegram photo caption limit is 1024 chars
    if (caption.length <= 1024) {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }

    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 30_000,
      },
    );
    return true;
  } catch (err: any) {
    console.error('Telegram photo send failed:', err?.response?.data || err.message);
    return false;
  }
}

// ── Format new-order notification ────────────────────────────────────────────

export function formatOrderMessage(order: {
  orderNumber: string;
  total: number;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingProvince: string;
  notes?: string | null;
  paymentMethod: string;
  createdAt: Date;
  items: {
    quantity: number;
    price: number;
    product: { name: string };
  }[];
}): string {
  const items = order.items
    .map(
      (i, idx) =>
        `  ${idx + 1}. ${i.product.name} x${i.quantity} — $${(Number(i.price) * i.quantity).toFixed(2)}`,
    )
    .join('\n');

  const paymentLabels: Record<string, string> = {
    ABA_PAY: 'ABA Pay',
    WING: 'Wing Money',
    CREDIT_CARD: 'Credit/Debit Card',
    CASH_ON_DELIVERY: 'Cash on Delivery',
  };

  const lines = [
    `<b>NEW ORDER — ${order.orderNumber}</b>`,
    ``,
    `<b>Items:</b>`,
    items,
    ``,
    `<b>Total:</b> $${order.total.toFixed(2)}`,
    `<b>Payment:</b> ${paymentLabels[order.paymentMethod] || order.paymentMethod}`,
    ``,
    `<b>Customer:</b>`,
    `  Name: ${order.shippingName}`,
    `  Phone: <a href="tel:${order.shippingPhone}">${order.shippingPhone}</a>`,
    `  Address: ${order.shippingAddress}, ${order.shippingCity}, ${order.shippingProvince}`,
  ];

  if (order.notes) {
    lines.push(`  Note: ${order.notes}`);
  }

  lines.push(
    ``,
    `<b>Status:</b> Pending`,
    `<b>Time:</b> ${order.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' })}`,
  );

  return lines.join('\n');
}

// ── Format invoice from DB order ─────────────────────────────────────────────

const LINE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

type OrderWithItems = {
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
  items: {
    quantity: number;
    price: any;
    product: { name: string };
  }[];
};

export async function fetchOrderForInvoice(
  orderIdOrNumber: string,
): Promise<OrderWithItems | null> {
  let order = await prisma.order.findUnique({
    where: { id: orderIdOrNumber },
    include: {
      items: {
        include: { product: { select: { name: true } } },
      },
    },
  });

  if (!order) {
    order = await prisma.order.findUnique({
      where: { orderNumber: orderIdOrNumber },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });
  }

  return order as OrderWithItems | null;
}

export function formatInvoice(order: OrderWithItems, showDetails: boolean = true): string {
  const paymentLabels: Record<string, string> = {
    ABA_PAY: 'ABA Pay',
    WING: 'Wing Money',
    CREDIT_CARD: 'Credit/Debit Card',
    CASH_ON_DELIVERY: 'Cash on Delivery',
  };

  const lines: string[] = [
    `<b>INVOICE — ${order.orderNumber}</b>`,
    ``,
    `<b>DELIVERY INFO</b>`,
    `Name: ${order.shippingName}`,
    `Phone: <a href="tel:${order.shippingPhone}">${order.shippingPhone}</a>`,
    `Address: ${order.shippingAddress}, ${order.shippingCity}, ${order.shippingProvince}`,
  ];

  if (order.notes) {
    lines.push(`Note: ${order.notes}`);
  }

  lines.push(``, LINE);

  if (showDetails) {
    lines.push(`<b>PRODUCTS</b>`);
    for (const item of order.items) {
      const lineTotal = (Number(item.price) * item.quantity).toFixed(2);
      lines.push(`${item.product.name} | ${item.quantity} | $${lineTotal}`);
    }
    lines.push(LINE);
  }

  lines.push(`<b>TOTAL: $${order.total.toFixed(2)}</b>`);
  lines.push(LINE);
  lines.push(``);
  lines.push(`Payment: ${paymentLabels[order.paymentMethod] || order.paymentMethod}`);
  lines.push(
    `Date: ${order.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' })}`,
  );

  return lines.join('\n');
}

export async function sendInvoice(
  orderIdOrNumber: string,
  showDetails: boolean = true,
): Promise<{ success: boolean; message: string }> {
  const order = await fetchOrderForInvoice(orderIdOrNumber);

  if (!order) {
    return { success: false, message: `Order "${orderIdOrNumber}" not found` };
  }

  // Render invoice as a PNG image and send as a photo
  try {
    const invoiceData = {
      orderNumber: order.orderNumber,
      total: Number(order.total),
      shippingName: order.shippingName,
      shippingPhone: order.shippingPhone,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
      shippingProvince: order.shippingProvince,
      notes: order.notes,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        price: Number(i.price),
      })),
    };
    const canvas = await renderInvoice(invoiceData);
    const pngBuffer = Buffer.from(await canvas.toBuffer('png'));
    const sent = await sendTelegramPhoto(pngBuffer, '');

    if (!sent) {
      return { success: false, message: 'Failed to send Telegram photo' };
    }

    return {
      success: true,
      message: `Invoice for ${order.orderNumber} sent to Telegram`,
    };
  } catch (err: any) {
    console.error('Failed to render invoice image:', err);
    // Fallback: send text-only invoice
    const invoice = formatInvoice(order, showDetails);
    const sent = await sendTelegramMessage(invoice);
    if (!sent) {
      return { success: false, message: 'Failed to send Telegram message' };
    }
    return {
      success: true,
      message: `Invoice for ${order.orderNumber} sent to Telegram (text fallback)`,
    };
  }
}

// ── Format manual invoice (admin types products directly) ────────────────────

type ManualProduct = {
  name: string;
  quantity: number;
  price: number;
};

type ManualInvoiceData = {
  products: ManualProduct[];
  customerName: string;
  customerPhone: string;
  customerAddress: string;
};

export function parseManualInvoice(rawBody: string): ManualInvoiceData | null {
  const lines = rawBody.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  // Split on "---" separator, or find first line starting with Name:
  let productLines: string[] = [];
  let customerLines: string[] = [];
  let separatorIdx = lines.findIndex((l) => l === '---');

  if (separatorIdx !== -1) {
    productLines = lines.slice(0, separatorIdx);
    customerLines = lines.slice(separatorIdx + 1);
  } else {
    // Find first line that starts with Name: / Phone: / Address:
    const firstCustomerIdx = lines.findIndex((l) =>
      /^(name|phone|address)\s*:/i.test(l),
    );
    if (firstCustomerIdx === -1) return null;
    productLines = lines.slice(0, firstCustomerIdx);
    customerLines = lines.slice(firstCustomerIdx);
  }

  // Parse products: "Product Name | qty | price"
  const products: ManualProduct[] = [];
  for (const line of productLines) {
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 3) continue;

    const name = parts[0];
    const quantity = parseInt(parts[1], 10);
    const price = parseFloat(parts[2].replace(/[^0-9.]/g, ''));

    if (!name || isNaN(quantity) || isNaN(price)) continue;
    products.push({ name, quantity, price });
  }

  if (products.length === 0) return null;

  // Parse customer info
  const customer: Record<string, string> = {};
  for (const line of customerLines) {
    const match = line.match(/^(name|phone|address)\s*:\s*(.+)/i);
    if (match) {
      customer[match[1].toLowerCase()] = match[2].trim();
    }
  }

  return {
    products,
    customerName: customer['name'] || 'N/A',
    customerPhone: customer['phone'] || 'N/A',
    customerAddress: customer['address'] || 'N/A',
  };
}

export function formatManualInvoice(data: ManualInvoiceData, showDetails: boolean = true): string {
  const total = data.products.reduce(
    (sum, p) => sum + p.price * p.quantity,
    0,
  );

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
  });

  const lines: string[] = [
    `<b>INVOICE</b>`,
    ``,
    `<b>DELIVERY INFO</b>`,
    `Name: ${data.customerName}`,
    `Phone: <a href="tel:${data.customerPhone}">${data.customerPhone}</a>`,
    `Address: ${data.customerAddress}`,
    ``,
    LINE,
  ];

  if (showDetails) {
    lines.push(`<b>PRODUCTS</b>`);
    for (const p of data.products) {
      const lineTotal = (p.price * p.quantity).toFixed(2);
      lines.push(`${p.name} | ${p.quantity} | $${lineTotal}`);
    }
    lines.push(LINE);
  }

  lines.push(`<b>TOTAL: $${total.toFixed(2)}</b>`);
  lines.push(LINE);
  lines.push(``);
  lines.push(`Date: ${now}`);

  return lines.join('\n');
}

// ── Bot polling ──────────────────────────────────────────────────────────────

let lastUpdateId = 0;
let polling = false;

async function handleBotUpdate(update: any) {
  const message = update.message;
  if (!message) return;

  const chatId = String(message.chat.id);
  const text: string = message.text || '';

  if (!text.startsWith('/invoice')) return;

  // ── Mode 1: /invoice BBS-xxx [-detail] — fetch from DB ─────────────────
  // ── Mode 2: /invoice [-detail] + multi-line body — manual entry ────────

  const firstLine = text.split('\n')[0].trim();
  const flags = firstLine.split(/\s+/).slice(1); // everything after /invoice on first line
  const showDetails = !flags.includes('-detail');

  // Check if first non-flag arg looks like an order reference (starts with BBS or has digits)
  const orderRef = flags.find(
    (f) => !f.startsWith('-') && f.length > 0,
  );

  if (orderRef) {
    // Mode 1: DB order
    const result = await sendInvoice(orderRef, showDetails);
    await sendTelegramMessage(result.message, chatId);
    return;
  }

  // Mode 2: Manual entry — rest of the message after first line is the body
  const bodyLines = text.split('\n').slice(1).join('\n').trim();
  if (!bodyLines) {
    await sendTelegramMessage(
      [
        'Usage:',
        '',
        '<b>Mode 1 — DB order:</b>',
        '/invoice BBS-20260727-ABC123',
        '',
        '<b>Mode 2 — Manual:</b>',
        '/invoice',
        'Snail Mucin | 4 | 10',
        'COSRX Cleanser | 2 | 12.99',
        '---',
        'Name: Sophea',
        'Phone: +85598765432',
        'Address: 123 St, Phnom Penh',
        '',
        'Add <code>-detail</code> after /invoice to hide product lines.',
      ].join('\n'),
      chatId,
    );
    return;
  }

  const parsed = parseManualInvoice(bodyLines);
  if (!parsed) {
    await sendTelegramMessage(
      'Could not parse message. Use format:\nProduct | qty | price\n---\nName: ...\nPhone: ...\nAddress: ...',
      chatId,
    );
    return;
  }

  const invoice = formatManualInvoice(parsed, showDetails);
  const sent = await sendTelegramMessage(invoice);
  if (!sent) {
    await sendTelegramMessage('Failed to send invoice', chatId);
  }
}

async function pollUpdates() {
  if (!TELEGRAM_BOT_TOKEN || polling) return;
  polling = true;

  try {
    const res = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`,
      {
        params: {
          offset: lastUpdateId + 1,
          timeout: 5,
          allowed_updates: '["message"]',
        },
        timeout: 15_000,
      },
    );

    const updates = res.data.result || [];
    for (const update of updates) {
      lastUpdateId = update.update_id;
      await handleBotUpdate(update);
    }
  } catch {
    // Silent fail — will retry on next poll
  } finally {
    polling = false;
  }
}

export function startTelegramBot() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('Telegram bot not configured — command polling disabled');
    return;
  }

  console.log('Telegram bot polling started');

  async function loop() {
    await pollUpdates();
    setTimeout(loop, 1000);
  }

  loop();
}
