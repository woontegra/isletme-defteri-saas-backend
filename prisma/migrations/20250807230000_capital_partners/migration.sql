-- CreateTable
CREATE TABLE "capital_partners" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "unvan" TEXT,
    "telefon" TEXT,
    "eposta" TEXT,
    "aktifMi" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capital_partners_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "partner_capital_transactions" ADD COLUMN "partnerId" TEXT;

-- CreateIndex
CREATE INDEX "capital_partners_tenantId_aktifMi_idx" ON "capital_partners"("tenantId", "aktifMi");

-- CreateIndex
CREATE INDEX "partner_capital_transactions_tenantId_partnerId_idx" ON "partner_capital_transactions"("tenantId", "partnerId");

-- AddForeignKey
ALTER TABLE "capital_partners" ADD CONSTRAINT "capital_partners_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_capital_transactions" ADD CONSTRAINT "partner_capital_transactions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "capital_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
