/**
 * Smart phone normalization + matching.
 * Treats all of these as the same number:
 *   855715727419 === +855715727419 === 8550715727419 === 0715727419
 * (Cambodian country code 855 + trunk 0 + 9-digit subscriber number)
 */

export function stripNondigits(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}

export function canonicalPhone(v: unknown): string {
  let d = stripNondigits(v);
  if (d.startsWith('855') && d.length >= 12) d = d.slice(3);
  d = d.replace(/^0+/, '');
  return d;
}

export function phoneMatches(stored: unknown, query: unknown): boolean {
  const s = canonicalPhone(stored);
  const q = canonicalPhone(query);
  if (!s || !q) return false;
  if (s === q) return true;
  if (q.length >= 6 && s.endsWith(q)) return true;
  return false;
}

export function isPhoneLikeQuery(v: unknown): boolean {
  return stripNondigits(v).length >= 6;
}