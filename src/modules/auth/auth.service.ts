import { z } from "zod";
import { prisma } from "../../prisma";
import { verifyPassword } from "../../utils/password";
import { signToken } from "../../utils/jwt";

const loginSchema = z.object({
  eposta: z.string().email("Geçerli bir e-posta adresi girin."),
  sifre: z.string().min(1, "Şifre gereklidir."),
});

export async function login(eposta: string, sifre: string) {
  const data = loginSchema.parse({ eposta, sifre });

  const user = await prisma.user.findFirst({
    where: { eposta: data.eposta.toLowerCase() },
    include: { tenant: true },
  });

  if (!user) {
    throw new Error("E-posta veya şifre hatalı.");
  }

  if (!user.aktifMi) {
    throw new Error("Hesabınız pasif durumda. Yöneticinizle iletişime geçin.");
  }

  if (user.tenant.status !== "ACTIVE") {
    throw new Error("İşletme hesabı pasif durumda.");
  }

  const valid = await verifyPassword(data.sifre, user.passwordHash);
  if (!valid) {
    throw new Error("E-posta veya şifre hatalı.");
  }

  const token = signToken({
    userId: user.id,
    tenantId: user.tenantId,
    rol: user.rol,
  });

  return {
    token,
    user: {
      id: user.id,
      adSoyad: user.adSoyad,
      kullaniciAdi: user.kullaniciAdi,
      eposta: user.eposta,
      telefon: user.telefon,
      rol: user.rol,
      aktifMi: user.aktifMi,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
      },
    },
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  });

  if (!user || !user.aktifMi) {
    throw new Error("Kullanıcı bulunamadı.");
  }

  if (user.tenant.status !== "ACTIVE") {
    throw new Error("İşletme hesabı pasif durumda.");
  }

  return {
    id: user.id,
    adSoyad: user.adSoyad,
    kullaniciAdi: user.kullaniciAdi,
    eposta: user.eposta,
    telefon: user.telefon,
    rol: user.rol,
    aktifMi: user.aktifMi,
    tenant: {
      id: user.tenant.id,
      name: user.tenant.name,
      slug: user.tenant.slug,
    },
  };
}
