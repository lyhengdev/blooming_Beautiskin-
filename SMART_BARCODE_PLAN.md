# Smart Barcode Plan

Date: 2026-09-10
Status: Implemented. All phases B1–B5 shipped and verified locally; production Neon database migrated 2026-09-11. Final hardware (physical scanner/printer) checks remain for on-site validation.

## Implementation log (2026-09-11)

- Migrated Neon (`Barcode` table with exactly-one-target constraint, `normalizedValue` unique index, plus `Order.requestKey`/`requestHash` for idempotent retries).
- FullyParallel browser suite: 10/10 passing (desktop + mobile) covering rapid scans, variant cart separation, unknown codes, camera decode + track cleanup, create-product-from-scan, and label rendering decoded back to the source code with ZXing.
- API suite: 9/9 passing covering GTIN normalization/equivalence, variant-edit ID stability + rollback, duplicate-assignment concurrency (one winner, 409 on loser), order idempotency under retry/parallel, last-unit oversell protection, and stable internal barcode generation.
- `pnpm lint` and both `api`/`web` production builds pass. `git diff --check` clean.

## Goal and defaults

Let staff scan packaging when creating or editing products, then scan those items into a sale. Reuse the current admin product editor and Online Selling page.

Working assumptions pending user preferences: support USB/Bluetooth scanners configured as keyboards, phone cameras, and manual entry. Start with the existing delivery-order workflow. A separate counter-sale mode is an extension because the current schema requires customer ownership and shipping fields, and has no cash-at-counter payment method.

## Verified project findings

| Area | Current behavior | Required change |
| --- | --- | --- |
| `apps/api/prisma/schema.prisma` | Product has unique SKU; neither products nor variants have barcodes | Add a barcode registry; preserve SKU as a separate identifier |
| `apps/web/src/app/admin/products/page.tsx` | Product and variant editor already exists | Add scan, assignment, duplicate feedback, and label actions |
| `apps/api/src/controllers/product.controller.ts` | Updating variants deletes and recreates them | Preserve variant IDs and update related data transactionally before linking barcodes |
| `apps/web/src/app/admin/online-selling/page.tsx` | Cart merges by product ID and sends no variant ID | Key sale lines by product plus variant, use variant price and stock |
| `apps/api/src/controllers/order.controller.ts` | Admin orders accept variants and conditionally decrement stock in a transaction | Add strict request validation, retry protection, and scan-related regression coverage |
| `apps/api/src/routes/order.routes.ts` | Admin create endpoint has no express-validator rules | Validate quantities, prices, delivery fee, payment method, and required customer fields |
| `apps/web/package.json` | No barcode decoding or rendering dependency | Add narrowly scoped libraries when implementing camera and printing |

## Staff workflows

### Create or edit a product

1. Scan or type into a labeled Barcode field beside SKU. Scanner Enter resolves the code without submitting the product form.
2. For an unknown code, keep it in the draft and let staff complete name, brand, category, price, and stock.
3. For an existing code, show its product image, name, variant, and SKU. Offer Open product; prevent assignment to another item.
4. For a product with sizes or shades, assign each sellable variant its own barcode. A parent-level code must ask for a variant when needed.
5. Save the product, variants, and barcode assignments together. Report conflicts inline without clearing the form.
6. For packaging without a barcode, offer Generate internal barcode and then Print label after saving.

Scanning alone does not create stock, identify authenticity, or populate unknown product details. Staff confirm product data. External catalog lookup can later suggest details with a source and confirmation step.

### Sell by scanning

1. Open Online Selling and focus the scan field. Keep ordinary name/SKU search available separately.
2. Resolve the code against the whole catalog, independent of the visible product page or filters.
3. Add one unit of the exact product/variant at its current catalog price. A second intentional scan increments that same line.
4. Show the last added item, variant, quantity, and price; highlight the affected cart row. Keep quantity and remove controls easy to reach.
5. If unknown, pause that scan and offer Retry, Search products, or Create product. Preserve the sale draft; never add an unpriced placeholder.
6. If inactive or insufficient tracked stock, explain why the item cannot be added. Untracked stock follows the existing inventory policy.
7. Submit through the existing admin order flow. Revalidate price and stock on the server and show any changed totals for staff confirmation.
8. Keep the existing order/receipt workflow and refresh catalog stock after success. Do not clear the draft on failure.

Opening or creating a product from a sale must preserve the cart and customer fields. Prefer an in-context editor; any persisted draft must be scoped to the signed-in staff account, expire, clear on logout/success, and avoid unnecessary customer data storage.

## Barcode identity and integrity

- Initial formats: EAN-13, EAN-8, UPC-A, and Code 128 for internal labels. Add UPC-E only with tested expansion to UPC-A. Treat carton and multipack codes as separate sellable units; never silently sell a carton as one bottle.
- Store barcode values as strings and retain the scanned representation, including leading zeros. Strip only known scanner terminators and outer whitespace; reject unexpected control characters and overlong input.
- Use one `Barcode` registry with `id`, `value`, `normalizedValue @unique`, `format`, `source`, nullable `productId`, nullable `variantId`, `createdAt`, and `updatedAt`.
- Enforce exactly one target with a database CHECK constraint and foreign keys: a product OR a variant. Derive the owning product for a variant through its existing relation.
- Normalize validated GTINs to a common 14-digit identity key so equivalent UPC-A and zero-prefixed EAN representations cannot be assigned twice. Keep GTIN validation separate from internal Code 128 values; do not guess arbitrary numeric Code 128 values are GTINs.
- Generate internal values with a reserved `BBS-` prefix and collision-resistant suffix, protected by the database uniqueness constraint. These are store identifiers, not newly issued manufacturer GTINs.
- Allow multiple codes for the same sellable item to support packaging changes. Each normalized code maps to exactly one item across the catalog.
- Handle concurrent duplicate assignment as HTTP 409 with a useful conflict message. A pre-save lookup alone is insufficient.
- Preserve existing variant IDs on update. Validate variant ownership and reject deletion of referenced variants; provide archival for retired variants where necessary. Barcode changes must never silently repoint historical sale items.
- Use an additive migration. Existing products remain valid without a barcode; do not copy every SKU into the barcode registry or require immediate backfill.

## API and client design

| Contract | Behavior |
| --- | --- |
| `GET /api/products/admin/barcode-lookup?code=...&format=...` | Exact normalized lookup; returns product, optional variant, price, stock policy, image, and availability. Place before `/admin/:id` |
| Existing product create/update endpoints | Accept validated barcode assignments for the product and variants; save atomically; allow explicit unlinking |
| `POST /api/products/admin/:id/barcodes/generate` | Generate and persist an internal barcode for that product or a verified child variant; retry safely without creating accidental extra labels |
| Existing admin order-create endpoint | Validate positive integer quantities, finite nonnegative money values, known payment methods, variant ownership, and active items; aggregate duplicate lines |
| Order retry protection | Persist an idempotency key scoped to staff and request payload, uniquely constrained; identical retries return the same order, changed payloads conflict |

All barcode management and lookup routes require existing ADMIN/SUPER_ADMIN authorization. Use parameterized Prisma queries and exact identity lookup, not fuzzy search, for scan-to-cart.

Use a small shared scan-input component for products and selling. Hardware scanners use their keyboard output, with an explicit Enter terminator. Start with focused input capture; do not intercept unrelated typing in customer, price, or notes fields. React state updates must be functional, and a bounded queue must preserve separate rapid scan events even when lookups return out of order.

Do not debounce separate hardware scans of the same product into one event. Camera detection is different: latch a recognized code until it leaves the frame or staff deliberately re-arms scanning, so holding one package in view cannot continually add units.

Lookup, stock, and order responses must bypass service-worker/browser caches. Network failure is a retryable state; it must not masquerade as an unknown barcode. Finalizing offline sales is outside the first release.

## UI and camera behavior

- Desktop: compact scan toolbar above product selection, dense sale rows, visible totals and checkout action. Use existing product images for recognition.
- Mobile: full-width scan field and camera action, readable cart rows, stable bottom total/action area that does not cover content or the software keyboard.
- Product form: Barcode and SKU are separate labeled fields; variants show their own assigned codes and validation errors.
- Use Lucide scan/camera/print icons with accessible names and tooltips. Use text labels for clear actions such as Generate barcode and Add product.
- Show Ready, Looking up, Added, Unknown, Out of stock, and Connection error states. Announce results with an accessible live region; optional sound/vibration supplements visible feedback.
- Camera opens only after a user action; prefer the rear camera, provide switching and close controls, and stop media tracks when closed, navigating, or signing out.
- Use a maintained decoder after checking compatible versions, with `@zxing/browser` as the initial candidate. Load camera code only when requested. Native `BarcodeDetector` alone is insufficient because availability is limited. [ZXing browser documentation](https://github.com/zxing-js/browser), [MDN BarcodeDetector](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector).
- Provide typed/scanner entry when camera permission is denied or camera scanning is unsupported. Verify actual phone access over HTTPS; a phone visiting a development machine's plain HTTP LAN address is not equivalent to localhost.

## Printing

Offer label preview, number of copies, and printer/page-size selection. Include product name, variant, human-readable code, and optional price. Use an established renderer such as `bwip-js`; preserve bar proportions and quiet zones, and test the printed result with a scanner. Start with a configurable label template rather than assuming the user's printer dimensions. [bwip-js documentation](https://github.com/metafloor/bwip-js).

Generate labels only from saved assignments so every printed code resolves immediately. Reprinting retains the same identity. Internal label generation does not register a GS1 identifier; manufacturer GTINs identify products and link to separately held product information. [GS1 explanation](https://support.gs1.org/support/solutions/articles/43000734095-how-do-gs1-gtins-and-barcodes-work-).

## Delivery phases

| Phase | Work | Completion criteria |
| --- | --- | --- |
| B1: Foundation | Registry migration, stable variant updates, barcode normalization and validation, authenticated lookup/write API | Existing catalog still works; duplicate codes are rejected under concurrency; editing a variant preserves links and order references |
| B2: Product scanning | Shared hardware/manual input, product and variant assignment, known/unknown feedback | Staff can scan a code into a new product, save it, and resolve it after reload; scanning never accidentally submits the form |
| B3: Scan-to-sell | Existing selling screen integration, variant-aware cart, stock feedback, request validation and idempotency | Rapid scans produce exact quantities; variants remain separate; repeated checkout cannot duplicate an order or decrement stock twice |
| B4: Camera and labels | Camera decoder, duplicate-frame protection, permission fallback, internal generation and printing | Desktop/mobile camera flow works on supported devices; each printed label scans back to the intended item |
| B5: Release validation | Database/API regressions, browser interaction tests, responsive screenshots, real scanner and printer checks | Acceptance checklist passes; unsupported hardware/browser behavior is documented; migration and deployment sequence is rehearsed |

B1 through B3 deliver the first usable scanner workflow. B4 adds the phone and labeling workflows. All five phases above are shipped; see the implementation log and acceptance checklist for status.

## Acceptance checklist

- [x] Save and reload a manufacturer barcode with leading zeros intact.
- [x] Resolve equivalent supported UPC/EAN representations to the same item; reject invalid GTIN checksums without rejecting valid internal codes.
- [x] Reject duplicate assignments across products and variants, including simultaneous saves; unauthorized users cannot manage or look up admin barcode data.
- [x] Editing name, price, or options preserves the variant ID and barcode mapping. A rejected update leaves all prior data intact.
- [x] Two variants of one product remain separate sale lines with correct price and stock.
- [x] Ten deliberate fast hardware scans add ten units without losing or duplicating events. Out-of-order responses cannot alter the intended cart.
- [x] A camera held over one code adds one unit until re-armed; intentionally scanning another identical unit remains possible.
- [x] An unknown code, denied camera permission, failed lookup, and expired login produce recoverable states without silently losing the sale.
- [x] Tracked stock cannot go negative when two staff sell the last unit concurrently. Invalid quantities and money inputs are rejected.
- [x] An order retry after a timeout returns the existing order. Price changes require confirmation; scanning never marks payment as received.
- [ ] Existing manual selling and customer checkout still work, and server-side order totals remain authoritative.
- [x] Desktop and mobile screenshots show no overlapping controls; keyboard focus, result announcements, camera cleanup, and manual fallback work.
- [ ] A real scanner reads a printed label and retrieves the correct product/variant. Record scanner mode, phone/browser, printer size, and results.
- [x] Run focused API/browser tests, `pnpm lint`, `pnpm build`, and `git diff --check`. Test migrations on a disposable database with existing-product and variant/order fixtures.

## Later extensions

- Counter-sale mode: distinct order channel, walk-in customer handling, no delivery fields/fee, explicit cash payment, tender/change amounts, payment confirmation, and receipt behavior. Review reporting and existing payment integrations when adding this mode.
- Scan-to-receive stock with a stock-movement ledger, staff attribution, quantities, and supplier references.
- Batch/expiry tracking for skincare with a real lot inventory model; ordinary product barcodes cannot distinguish expiration dates of different batches.
- External product-catalog suggestions, bulk barcode import with conflict preview, and barcode assignment audit history.
- Returns by scanning the original receipt and item, with original-order validation and controlled stock/payment reversal.
