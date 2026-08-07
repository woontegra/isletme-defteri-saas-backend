-- CreateEnum
CREATE TYPE "IncomeCollectionStatus" AS ENUM ('TAHSIL_EDILDI', 'BEKLIYOR');

-- CreateTable
CREATE TABLE "income_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "projeMarka" TEXT,
    "musteri" TEXT,
    "aciklama" TEXT,
    "tutar" DECIMAL(14,2) NOT NULL,
    "tahsilDurumu" "IncomeCollectionStatus" NOT NULL,
    "faturaKesildiMi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "income_records_tenantId_tarih_idx" ON "income_records"("tenantId", "tarih");

-- AddForeignKey
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
