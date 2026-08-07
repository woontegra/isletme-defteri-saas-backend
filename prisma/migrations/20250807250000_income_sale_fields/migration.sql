-- CreateEnum
CREATE TYPE "IncomeSaleType" AS ENUM ('YAZILIM_ABONELIK', 'YAZILIM_LISANS', 'HIZMET', 'DANISMANLIK', 'EGITIM', 'DIGER');

-- AlterTable
ALTER TABLE "income_records" ADD COLUMN "urunHizmet" TEXT,
ADD COLUMN "satisTuru" "IncomeSaleType",
ADD COLUMN "donemPaket" TEXT;
