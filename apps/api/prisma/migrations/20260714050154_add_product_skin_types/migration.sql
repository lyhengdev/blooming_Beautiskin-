-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "concerns" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "skinTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
