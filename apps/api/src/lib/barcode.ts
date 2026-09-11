import { AppError } from '../middlewares/errorHandler';

export function normalizeBarcode(input: unknown, format?: unknown) {
  if (typeof input !== 'string') throw new AppError('Barcode must be text', 400);
  const value = input.trim();
  if (!value || value.length > 80 || !/^[\x20-\x7E]+$/.test(value)) {
    throw new AppError('Barcode must contain 1 to 80 printable characters', 400);
  }
  const kind = format || (/^\d{8}$|^\d{12,14}$/.test(value) ? 'GTIN' : 'CODE_128');
  if (!['GTIN', 'EAN_13', 'EAN_8', 'UPC_A', 'CODE_128'].includes(String(kind))) {
    throw new AppError('Unsupported barcode format', 400);
  }
  if (kind === 'CODE_128') return { value, format: 'CODE_128', normalizedValue: `CODE:${value}` };
  const lengths: Record<string, number> = { EAN_13: 13, EAN_8: 8, UPC_A: 12 };
  if (!/^\d+$/.test(value) || ![8, 12, 13, 14].includes(value.length) ||
      (lengths[String(kind)] && value.length !== lengths[String(kind)])) {
    throw new AppError('Invalid GTIN length', 400);
  }
  const digits = value.slice(0, -1).split('').reverse();
  const sum = digits.reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  if ((10 - sum % 10) % 10 !== Number(value.slice(-1))) {
    throw new AppError('Invalid barcode check digit. Check the printed number.', 400);
  }
  return { value, format: 'GTIN', normalizedValue: `GTIN:${value.padStart(14, '0')}` };
}

export function barcodeAssignments(input: unknown) {
  if (!Array.isArray(input) || input.length > 20) throw new AppError('Provide at most 20 barcodes per item', 400);
  const codes = input.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || !('value' in entry)) throw new AppError('Invalid barcode assignment', 400);
    return normalizeBarcode(entry.value, 'format' in entry ? entry.format : undefined);
  });
  if (new Set(codes.map((code) => code.normalizedValue)).size !== codes.length) {
    throw new AppError('This barcode is listed more than once', 409);
  }
  return codes;
}
