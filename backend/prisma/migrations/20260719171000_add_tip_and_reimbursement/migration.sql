-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "isReimbursement" BOOLEAN DEFAULT false,
ADD COLUMN     "reimbursements" JSONB,
ADD COLUMN     "tip" DOUBLE PRECISION DEFAULT 0;
