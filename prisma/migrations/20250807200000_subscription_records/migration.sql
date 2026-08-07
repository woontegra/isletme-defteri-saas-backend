-- CreateEnum
CREATE TYPE "SubscriptionBillingCycle" AS ENUM ('AYLIK', 'YILLIK', 'OZEL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('AKTIF', 'DURAKLATILDI', 'IPTAL');

-- CreateTable
CREATE TABLE "subscription_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hizmetAdi" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "projeMarka" TEXT,
    "faturaDonemi" "SubscriptionBillingCycle" NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "sonrakiYenilemeTarihi" TIMESTAMP(3),
    "durum" "SubscriptionStatus" NOT NULL,
    "not" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_records_tenantId_sonrakiYenilemeTarihi_idx" ON "subscription_records"("tenantId", "sonrakiYenilemeTarihi");

-- AddForeignKey
ALTER TABLE "subscription_records" ADD CONSTRAINT "subscription_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
