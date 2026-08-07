-- CreateEnum
CREATE TYPE "UserRole_new" AS ENUM ('BURO_SAHIBI', 'AVUKAT_YONETICI', 'KATIP_PERSONEL');

-- Add new columns
ALTER TABLE "users" ADD COLUMN "adSoyad" TEXT;
ALTER TABLE "users" ADD COLUMN "kullaniciAdi" TEXT;
ALTER TABLE "users" ADD COLUMN "eposta" TEXT;
ALTER TABLE "users" ADD COLUMN "telefon" TEXT;
ALTER TABLE "users" ADD COLUMN "aktifMi" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "rol" "UserRole_new";

-- Migrate existing data
UPDATE "users" SET
  "adSoyad" = "name",
  "eposta" = "email",
  "kullaniciAdi" = split_part("email", '@', 1),
  "aktifMi" = ("status" = 'ACTIVE'),
  "rol" = CASE
    WHEN "role"::text = 'OWNER' THEN 'BURO_SAHIBI'::"UserRole_new"
    WHEN "role"::text = 'ADMIN' THEN 'AVUKAT_YONETICI'::"UserRole_new"
    ELSE 'KATIP_PERSONEL'::"UserRole_new"
  END;

ALTER TABLE "users" ALTER COLUMN "adSoyad" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "kullaniciAdi" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "eposta" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "rol" SET NOT NULL;

-- Drop old columns and enum
DROP INDEX IF EXISTS "users_tenantId_email_key";
ALTER TABLE "users" DROP COLUMN "name";
ALTER TABLE "users" DROP COLUMN "email";
ALTER TABLE "users" DROP COLUMN "role";
ALTER TABLE "users" DROP COLUMN "status";

DROP TYPE "UserRole";
DROP TYPE "UserStatus";

ALTER TYPE "UserRole_new" RENAME TO "UserRole";

CREATE UNIQUE INDEX "users_tenantId_eposta_key" ON "users"("tenantId", "eposta");
CREATE UNIQUE INDEX "users_tenantId_kullaniciAdi_key" ON "users"("tenantId", "kullaniciAdi");
