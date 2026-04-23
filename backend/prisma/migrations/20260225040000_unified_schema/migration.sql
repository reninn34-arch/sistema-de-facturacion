-- Migración unificada del schema completo
-- Consolidada para evitar redundancias

-- CreateTable: Business
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradename" TEXT,
    "address" TEXT,
    "branchAddress" TEXT,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "logo" TEXT,
    "category" TEXT,
    "regime" TEXT,
    "isAccountingObliged" BOOLEAN NOT NULL DEFAULT false,
    "specialTaxpayerCode" TEXT,
    "withholdingAgentCode" TEXT,
    "isProduction" BOOLEAN NOT NULL DEFAULT false,
    "themeColor" TEXT NOT NULL DEFAULT '#2563eb',
    "establishmentCode" TEXT NOT NULL DEFAULT '001',
    "emissionPointCode" TEXT NOT NULL DEFAULT '001',
    "taxpayerType" TEXT NOT NULL DEFAULT 'EMPRESA',
    "notificationSettings" JSONB,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "features" JSONB,
    "subscriptionStart" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "subscriptionEnd" TIMESTAMP(3),
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VENDEDOR',
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Client
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "password" TEXT,
    "ruc" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "type" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Product
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "wholesalePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distributorPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" INTEGER NOT NULL DEFAULT 15,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "category" TEXT,
    "type" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Document
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "accessKey" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityRuc" TEXT,
    "entityEmail" TEXT,
    "entityPhone" TEXT,
    "entityAddress" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "additionalInfo" TEXT,
    "authorizedXml" TEXT,
    "creditNoteReason" TEXT,
    "paymentMethod" TEXT,
    "relatedDocumentAccessKey" TEXT,
    "relatedDocumentDate" TIMESTAMP(3),
    "relatedDocumentNumber" TEXT,
    "dueDate" TIMESTAMP(3),
    "source" TEXT DEFAULT 'LOCAL',
    "retentionTaxes" JSONB,
    "sustainingDocDate" TIMESTAMP(3),
    "sustainingDocNumber" TEXT,
    "sustainingDocTotal" DOUBLE PRECISION,
    "sustainingDocType" TEXT,
    "taxPeriod" TEXT,
    "userId" TEXT,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InvoiceItem
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Sequence
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "establishmentCode" TEXT NOT NULL,
    "emissionPointCode" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InventoryMovement
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "documentId" TEXT,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Subscription
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "paymentId" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT,
    "invoiceNumber" TEXT,
    "invoiceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Business
CREATE UNIQUE INDEX "Business_ruc_key" ON "Business"("ruc");

-- CreateIndex: User
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex: Client
CREATE UNIQUE INDEX "Client_ruc_businessId_key" ON "Client"("ruc", "businessId");

-- CreateIndex: Product
CREATE UNIQUE INDEX "Product_code_businessId_key" ON "Product"("code", "businessId");

-- CreateIndex: Document
CREATE UNIQUE INDEX "Document_accessKey_key" ON "Document"("accessKey");
CREATE INDEX "Document_issueDate_idx" ON "Document"("issueDate");
CREATE INDEX "Document_entityRuc_idx" ON "Document"("entityRuc");
CREATE INDEX "Document_status_idx" ON "Document"("status");
CREATE INDEX "Document_businessId_idx" ON "Document"("businessId");

-- CreateIndex: Sequence
CREATE UNIQUE INDEX "Sequence_type_establishmentCode_emissionPointCode_businessId_key" ON "Sequence"("type", "establishmentCode", "emissionPointCode", "businessId");

-- CreateIndex: Subscription
CREATE INDEX "Subscription_businessId_idx" ON "Subscription"("businessId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_startDate_idx" ON "Subscription"("startDate");

-- AddForeignKey: User -> Business
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Client -> Business
ALTER TABLE "Client" ADD CONSTRAINT "Client_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Product -> Business
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Document -> User
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Document -> Business
ALTER TABLE "Document" ADD CONSTRAINT "Document_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: InvoiceItem -> Document
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: InvoiceItem -> Product
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Sequence -> Business
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: InventoryMovement -> Product
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: InventoryMovement -> Document
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Subscription -> Business
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
