-- CreateEnum
CREATE TYPE "ExpensePaymentStatus" AS ENUM ('ODENDI', 'BEKLIYOR');

-- CreateTable
CREATE TABLE "expense_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "vadeTarihi" TIMESTAMP(3),
    "kategori" TEXT NOT NULL,
    "projeMarka" TEXT,
    "firmaTedarikci" TEXT,
    "aciklama" TEXT,
    "tutar" DECIMAL(14,2) NOT NULL,
    "kdvOrani" DECIMAL(5,2),
    "kdvDahilMi" BOOLEAN NOT NULL DEFAULT false,
    "odemeDurumu" "ExpensePaymentStatus" NOT NULL,
    "fisFaturaVarMi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_records_tenantId_tarih_idx" ON "expense_records"("tenantId", "tarih");

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
