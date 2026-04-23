-- DropForeignKey
ALTER TABLE "InventoryMovement" DROP CONSTRAINT "InventoryMovement_documentId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isSubscription" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subscriptionDuration" INTEGER,
ADD COLUMN     "subscriptionPeriod" TEXT;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Sequence_type_establishmentCode_emissionPointCode_businessId_ke" RENAME TO "Sequence_type_establishmentCode_emissionPointCode_businessI_key";
