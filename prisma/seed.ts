import { PrismaClient, UserRole, TenantStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "info@woontegra.com";
const LEGACY_ADMIN_EMAIL = "admin@woontegra.local";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Admin12345!";

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "woontegra" },
    update: {},
    create: {
      name: "Woontegra",
      slug: "woontegra",
      status: TenantStatus.ACTIVE,
    },
  });

  // Eski seed e-postasını yeni adrese taşı (mevcut kurulumlar için)
  await prisma.user.updateMany({
    where: {
      tenantId: tenant.id,
      kullaniciAdi: ADMIN_USERNAME,
      eposta: LEGACY_ADMIN_EMAIL,
    },
    data: { eposta: ADMIN_EMAIL },
  });

  await prisma.user.upsert({
    where: {
      tenantId_kullaniciAdi: {
        tenantId: tenant.id,
        kullaniciAdi: ADMIN_USERNAME,
      },
    },
    update: {
      passwordHash,
      eposta: ADMIN_EMAIL,
      adSoyad: "Serdar Topal",
      rol: UserRole.SIRKET_SAHIBI,
      aktifMi: true,
    },
    create: {
      tenantId: tenant.id,
      adSoyad: "Serdar Topal",
      kullaniciAdi: ADMIN_USERNAME,
      eposta: ADMIN_EMAIL,
      telefon: null,
      passwordHash,
      rol: UserRole.SIRKET_SAHIBI,
      aktifMi: true,
    },
  });

  console.log("Seed tamamlandı.");
  console.log("Tenant:", tenant.name);
  console.log(`Kullanıcı: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (SIRKET_SAHIBI)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
