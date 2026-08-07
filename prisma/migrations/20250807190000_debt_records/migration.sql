-- CreateEnum
CREATE TYPE "DebtRecordType" AS ENUM ('BORC', 'ALACAK');

-- CreateEnum
CREATE TYPE "DebtRecordStatus" AS ENUM ('ACIK', 'KAPANDI', 'IPTAL');

-- CreateTable
CREATE TABLE "debt_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tur" "DebtRecordType" NOT NULL,
    "kisiFirma" TEXT NOT NULL,
    "projeMarka" TEXT,
    "aciklama" TEXT,
    "tutar" DECIMAL(14,2) NOT NULL,
    "vadeTarihi" TIMESTAMP(3),
    "durum" "DebtRecordStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debt_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debt_records_tenantId_vadeTarihi_idx" ON "debt_records"("tenantId", "vadeTarihi");

-- AddForeignKey
ALTER TABLE "debt_records" ADD CONSTRAINT "debt_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
