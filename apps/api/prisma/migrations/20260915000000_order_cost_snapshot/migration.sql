-- Older sales retain unknown historical costs; analytics label current-cost estimates.
ALTER TABLE "OrderItem" ADD COLUMN "costPrice" DECIMAL(10,2),
ADD COLUMN "costRecorded" BOOLEAN NOT NULL DEFAULT false;
