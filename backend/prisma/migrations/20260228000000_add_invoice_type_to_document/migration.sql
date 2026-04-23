-- Migration: Add invoiceType field to Document table
-- Date: 2026-02-28

-- Add invoiceType column to Document table
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "invoiceType" TEXT DEFAULT 'CLIENT';
