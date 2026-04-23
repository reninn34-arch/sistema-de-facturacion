-- Consolidated migration for schema changes
-- 1. Add SRI fields to Business
-- 2. Add document codes to Document  
-- 3. Make InvoiceItem.productId nullable

-- 1. Add SRI fields to Business
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "electronicSignature" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "sriEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "sriPassword" TEXT;

-- 2. Add document codes to Document
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "establishmentCode" TEXT DEFAULT '001';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "emissionPointCode" TEXT DEFAULT '001';

-- 3. Make InvoiceItem.productId nullable to support items without products (services, generic descriptions)
ALTER TABLE "InvoiceItem" ALTER COLUMN "productId" DROP NOT NULL;
