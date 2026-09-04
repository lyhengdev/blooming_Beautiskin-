export type ReceiptSizeName = '58mm' | '80mm' | 'custom';

export interface ReceiptSize {
  name: ReceiptSizeName;
  widthPx: number;
}

// Printable width of 58mm thermal paper ≈ 48mm @ 203 DPI = 384px.
// This matches the previous canvas receipt width for continuity.
export const RECEIPT_SIZES: Partial<Record<ReceiptSizeName, number>> = {
  '58mm': 384,
  '80mm': 576, // 1.5× of 58mm printable width
};

export interface ReceiptConfig {
  sizeName: ReceiptSizeName;
  // Logical layout width (px). The PNG is rendered at widthPx * renderScale.
  widthPx: number;
  // Pixel-density (resolution) multiplier for high-quality output.
  // e.g. 3 → 384px logical width becomes a 1152px-wide image.
  renderScale: number;
  monochrome: boolean;
}

/**
 * Global default receipt paper size + resolution.
 *
 * Configure via env vars:
 *   RECEIPT_WIDTH=58mm   → 384px logical width (default)
 *   RECEIPT_WIDTH=80mm   → 576px logical width
 *   RECEIPT_WIDTH=384    → custom logical pixel width
 *   RECEIPT_SCALE=3      → render at 3× density (default; high quality)
 */
export function getReceiptConfig(): ReceiptConfig {
  const raw = (process.env.RECEIPT_WIDTH || '58mm').trim().toLowerCase();

  const parseScale = (): number => {
    const s = parseInt((process.env.RECEIPT_SCALE || '3').trim(), 10);
    return !Number.isNaN(s) && s > 0 ? s : 3;
  };

  if (RECEIPT_SIZES[raw as ReceiptSizeName]) {
    return {
      sizeName: raw as ReceiptSizeName,
      widthPx: RECEIPT_SIZES[raw as ReceiptSizeName] as number,
      renderScale: parseScale(),
      monochrome: true,
    };
  }

  const customPx = parseInt(raw, 10);
  if (!Number.isNaN(customPx) && customPx > 0) {
    return {
      sizeName: 'custom',
      widthPx: customPx,
      renderScale: parseScale(),
      monochrome: true,
    };
  }

  // Fallback to 58mm
  return {
    sizeName: '58mm',
    widthPx: RECEIPT_SIZES['58mm'] as number,
    renderScale: parseScale(),
    monochrome: true,
  };
}
