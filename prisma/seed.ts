import { PrismaClient, UserRole, TenantStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin12345!", 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "woontegra" },
    update: {},
    create: {
      name: "Woontegra",
      slug: "woontegra",
      status: TenantStatus.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: {
      tenantId_eposta: {
        tenantId: tenant.id,
        eposta: "admin@woontegra.local",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      adSoyad: "Serdar Topal",
      kullaniciAdi: "admin",
      eposta: "admin@woontegra.local",
      telefon: null,
      passwordHash,
      rol: UserRole.BURO_SAHIBI,
      aktifMi: true,
    },
  });

  console.log("Seed tamamlandı.");
  console.log("Tenant:", tenant.name);
  console.log("Kullanıcı: admin@woontegra.local / Admin12345! (BURO_SAHIBI)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
