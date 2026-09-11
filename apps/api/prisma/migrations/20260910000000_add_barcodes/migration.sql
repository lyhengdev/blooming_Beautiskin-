CREATE TABLE "Barcode" (
  "id" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "productId" TEXT,
  "variantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Barcode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Barcode_exactly_one_target" CHECK (("productId" IS NOT NULL) <> ("variantId" IS NOT NULL))
);
CREATE UNIQUE INDEX "Barcode_normalizedValue_key" ON "Barcode"("normalizedValue");
CREATE INDEX "Barcode_productId_idx" ON "Barcode"("productId");
CREATE INDEX "Barcode_variantId_idx" ON "Barcode"("variantId");
ALTER TABLE "Barcode" ADD CONSTRAINT "Barcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Barcode" ADD CONSTRAINT "Barcode_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD COLUMN "requestKey" TEXT, ADD COLUMN "requestHash" TEXT;
CREATE UNIQUE INDEX "Order_requestKey_key" ON "Order"("requestKey");
