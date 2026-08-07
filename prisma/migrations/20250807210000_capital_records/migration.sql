-- CreateEnum
CREATE TYPE "PartnerCapitalTransactionType" AS ENUM ('PARA_KOYMA', 'PARA_CEKME');

-- CreateTable
CREATE TABLE "capital_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sirketUnvani" TEXT,
    "kurulusTarihi" TIMESTAMP(3),
    "ticaretSicilGazeteTarihi" TIMESTAMP(3),
    "anaSermaye" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ortakParaCarpani" DECIMAL(8,2) NOT NULL DEFAULT 3,
    "uyariOrani" DECIMAL(5,4) NOT NULL DEFAULT 0.8,
    "sonSermayeArtirimTarihi" TIMESTAMP(3),
    "notlar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capital_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capital_increase_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "oncekiSermaye" DECIMAL(14,2),
    "yeniSermaye" DECIMAL(14,2) NOT NULL,
    "aciklama" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capital_increase_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_capital_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "ortakAdi" TEXT NOT NULL,
    "tur" "PartnerCapitalTransactionType" NOT NULL,
    "aciklama" TEXT,
    "tutar" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_capital_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "capital_settings_tenantId_key" ON "capital_settings"("tenantId");

-- CreateIndex
CREATE INDEX "capital_increase_records_tenantId_tarih_idx" ON "capital_increase_records"("tenantId", "tarih");

-- CreateIndex
CREATE INDEX "partner_capital_transactions_tenantId_tarih_idx" ON "partner_capital_transactions"("tenantId", "tarih");

-- AddForeignKey
ALTER TABLE "capital_settings" ADD CONSTRAINT "capital_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capital_increase_records" ADD CONSTRAINT "capital_increase_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_capital_transactions" ADD CONSTRAINT "partner_capital_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
