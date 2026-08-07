-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firmaUnvani" TEXT,
    "vergiDairesi" TEXT,
    "vergiNo" TEXT,
    "mersisNo" TEXT,
    "ticaretSicilNo" TEXT,
    "telefon" TEXT,
    "eposta" TEXT,
    "website" TEXT,
    "adres" TEXT,
    "sehir" TEXT,
    "ilce" TEXT,
    "postaKodu" TEXT,
    "varsayilanParaBirimi" TEXT NOT NULL DEFAULT 'TRY',
    "tarihFormati" TEXT NOT NULL DEFAULT 'DD.MM.YYYY',
    "saatDilimi" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantId_key" ON "tenant_settings"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
