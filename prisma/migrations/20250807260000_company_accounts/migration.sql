-- CreateEnum
CREATE TYPE "CompanyAccountType" AS ENUM ('BANKA', 'KASA', 'POS', 'DIGER');

-- CreateTable
CREATE TABLE "company_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hesapAdi" TEXT NOT NULL,
    "hesapTuru" "CompanyAccountType" NOT NULL,
    "bankaAdi" TEXT,
    "iban" TEXT,
    "hesapNo" TEXT,
    "paraBirimi" TEXT NOT NULL DEFAULT 'TRY',
    "aciklama" TEXT,
    "aktifMi" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_accounts_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "partner_capital_transactions" ADD COLUMN "companyAccountId" TEXT;

-- CreateIndex
CREATE INDEX "company_accounts_tenantId_aktifMi_idx" ON "company_accounts"("tenantId", "aktifMi");

-- CreateIndex
CREATE INDEX "partner_capital_transactions_tenantId_companyAccountId_idx" ON "partner_capital_transactions"("tenantId", "companyAccountId");

-- AddForeignKey
ALTER TABLE "company_accounts" ADD CONSTRAINT "company_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_capital_transactions" ADD CONSTRAINT "partner_capital_transactions_companyAccountId_fkey" FOREIGN KEY ("companyAccountId") REFERENCES "company_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
