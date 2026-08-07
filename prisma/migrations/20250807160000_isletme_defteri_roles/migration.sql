-- İşletme defteri SaaS rolleri
CREATE TYPE "UserRole_new" AS ENUM ('SIRKET_SAHIBI', 'YONETICI', 'PERSONEL', 'GORUNTULEYICI');

ALTER TABLE "users" ADD COLUMN "rol_new" "UserRole_new";

UPDATE "users" SET "rol_new" = CASE
  WHEN "rol"::text = 'BURO_SAHIBI' THEN 'SIRKET_SAHIBI'::"UserRole_new"
  WHEN "rol"::text = 'AVUKAT_YONETICI' THEN 'YONETICI'::"UserRole_new"
  WHEN "rol"::text = 'KATIP_PERSONEL' THEN 'PERSONEL'::"UserRole_new"
  ELSE 'PERSONEL'::"UserRole_new"
END;

ALTER TABLE "users" ALTER COLUMN "rol_new" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "rol_new" SET DEFAULT 'PERSONEL'::"UserRole_new";

ALTER TABLE "users" DROP COLUMN "rol";

ALTER TABLE "users" RENAME COLUMN "rol_new" TO "rol";

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
