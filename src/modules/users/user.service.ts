import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma";
import { hashPassword } from "../../utils/password";
import { AuthContext } from "../../middleware/auth";
import { auditLog } from "../../utils/audit";

export const userSelect = {
  id: true,
  adSoyad: true,
  kullaniciAdi: true,
  eposta: true,
  telefon: true,
  rol: true,
  aktifMi: true,
  createdAt: true,
  updatedAt: true,
} as const;

const assignableRoles = ["YONETICI", "PERSONEL", "GORUNTULEYICI"] as const;

export const createUserSchema = z.object({
  adSoyad: z.string().trim().min(1, "Ad soyad gereklidir."),
  kullaniciAdi: z.string().trim().min(3, "Kullanıcı adı en az 3 karakter olmalıdır."),
  eposta: z.string().trim().email("Geçerli bir e-posta adresi girin."),
  telefon: z.string().trim().optional().or(z.literal("")),
  sifre: z.string().min(8, "Şifre en az 8 karakter olmalıdır."),
  rol: z.enum(assignableRoles, {
    errorMap: () => ({ message: "Geçersiz rol seçimi." }),
  }),
});

export const updateUserSchema = z.object({
  adSoyad: z.string().trim().min(1, "Ad soyad gereklidir.").optional(),
  kullaniciAdi: z.string().trim().min(3, "Kullanıcı adı en az 3 karakter olmalıdır.").optional(),
  eposta: z.string().trim().email("Geçerli bir e-posta adresi girin.").optional(),
  telefon: z.string().trim().optional().or(z.literal("")),
  rol: z.enum(assignableRoles).optional(),
  aktifMi: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  yeniSifre: z.string().min(8, "Şifre en az 8 karakter olmalıdır."),
});

function assertSirketSahibi(actor: AuthContext) {
  if (actor.rol !== "SIRKET_SAHIBI") {
    throw new Error("Bu işlem yalnızca Şirket Sahibi tarafından yapılabilir.");
  }
}

function assertCanEditUser(
  actor: AuthContext,
  target: { id: string; rol: UserRole },
  parsed: z.infer<typeof updateUserSchema>
) {
  if (actor.rol === "SIRKET_SAHIBI") return;

  if (actor.rol !== "YONETICI") {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  if (target.rol === "SIRKET_SAHIBI") {
    throw new Error("Şirket Sahibi hesabı düzenlenemez.");
  }

  if (parsed.aktifMi !== undefined) {
    throw new Error("Kullanıcı durumu yalnızca Şirket Sahibi tarafından değiştirilebilir.");
  }
}

async function findTenantUser(tenantId: string, userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, tenantId },
  });
}

async function countActiveSirketSahibi(tenantId: string, excludeUserId?: string) {
  return prisma.user.count({
    where: {
      tenantId,
      rol: "SIRKET_SAHIBI",
      aktifMi: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

function isUniqueError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}

function uniqueFieldMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "meta" in err) {
    const target = (err as { meta?: { target?: string[] } }).meta?.target;
    if (target?.includes("kullaniciAdi")) {
      return "Bu kullanıcı adı bu işletmede zaten kayıtlı.";
    }
  }
  return "Bu e-posta adresi bu işletmede zaten kayıtlı.";
}

export async function listUsers(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    select: userSelect,
    orderBy: { createdAt: "asc" },
  });
}

export async function getUser(tenantId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: userSelect,
  });
  if (!user) throw new Error("Kullanıcı bulunamadı.");
  return user;
}

export async function createUser(
  tenantId: string,
  actor: AuthContext,
  data: z.infer<typeof createUserSchema>
) {
  assertSirketSahibi(actor);
  const parsed = createUserSchema.parse(data);

  const passwordHash = await hashPassword(parsed.sifre);

  try {
    const user = await prisma.user.create({
      data: {
        tenantId,
        adSoyad: parsed.adSoyad,
        kullaniciAdi: parsed.kullaniciAdi.toLowerCase(),
        eposta: parsed.eposta.toLowerCase(),
        telefon: parsed.telefon || null,
        passwordHash,
        rol: parsed.rol,
        aktifMi: true,
      },
      select: userSelect,
    });
    auditLog("USER_CREATE", actor.userId, user.id, { rol: user.rol });
    return user;
  } catch (err) {
    if (isUniqueError(err)) throw new Error(uniqueFieldMessage(err));
    throw err;
  }
}

export async function updateUser(
  tenantId: string,
  actor: AuthContext,
  userId: string,
  data: z.infer<typeof updateUserSchema>
) {
  const parsed = updateUserSchema.parse(data);
  const target = await findTenantUser(tenantId, userId);

  if (!target) throw new Error("Kullanıcı bulunamadı.");

  assertCanEditUser(actor, target, parsed);

  if (target.rol === "SIRKET_SAHIBI" && parsed.rol) {
    throw new Error("Şirket Sahibi rolü form üzerinden değiştirilemez.");
  }

  if (parsed.aktifMi === false) {
    assertSirketSahibi(actor);
    await assertCanDeactivate(tenantId, actor, target);
  }

  if (parsed.aktifMi === true && actor.rol !== "SIRKET_SAHIBI") {
    throw new Error("Kullanıcı durumu yalnızca Şirket Sahibi tarafından değiştirilebilir.");
  }

  const updateData: {
    adSoyad?: string;
    kullaniciAdi?: string;
    eposta?: string;
    telefon?: string | null;
    rol?: UserRole;
    aktifMi?: boolean;
  } = {};

  if (parsed.adSoyad) updateData.adSoyad = parsed.adSoyad;
  if (parsed.kullaniciAdi) updateData.kullaniciAdi = parsed.kullaniciAdi.toLowerCase();
  if (parsed.eposta) updateData.eposta = parsed.eposta.toLowerCase();
  if (parsed.telefon !== undefined) updateData.telefon = parsed.telefon || null;
  if (parsed.rol) updateData.rol = parsed.rol;
  if (parsed.aktifMi !== undefined) updateData.aktifMi = parsed.aktifMi;

  if (Object.keys(updateData).length === 0) {
    throw new Error("Güncellenecek alan bulunamadı.");
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: userSelect,
    });
    auditLog("USER_UPDATE", actor.userId, userId, { fields: Object.keys(updateData) });
    return user;
  } catch (err) {
    if (isUniqueError(err)) throw new Error(uniqueFieldMessage(err));
    throw err;
  }
}

async function assertCanDeactivate(
  tenantId: string,
  actor: AuthContext,
  target: { id: string; rol: UserRole; aktifMi: boolean }
) {
  if (target.id === actor.userId) {
    throw new Error("Kendi hesabınızı pasifleştiremezsiniz.");
  }

  if (target.rol === "SIRKET_SAHIBI" && target.aktifMi) {
    const others = await countActiveSirketSahibi(tenantId, target.id);
    if (others === 0) {
      throw new Error("Son aktif Şirket Sahibi pasifleştirilemez.");
    }
  }
}

export async function resetUserPassword(
  tenantId: string,
  actor: AuthContext,
  userId: string,
  data: z.infer<typeof resetPasswordSchema>
) {
  assertSirketSahibi(actor);
  const parsed = resetPasswordSchema.parse(data);
  const target = await findTenantUser(tenantId, userId);
  if (!target) throw new Error("Kullanıcı bulunamadı.");

  const passwordHash = await hashPassword(parsed.yeniSifre);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
    select: userSelect,
  });

  auditLog("USER_RESET_PASSWORD", actor.userId, userId);
  return user;
}

export async function deactivateUser(
  tenantId: string,
  actor: AuthContext,
  userId: string
) {
  assertSirketSahibi(actor);
  const target = await findTenantUser(tenantId, userId);
  if (!target) throw new Error("Kullanıcı bulunamadı.");

  await assertCanDeactivate(tenantId, actor, target);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { aktifMi: false },
    select: userSelect,
  });

  auditLog("USER_DEACTIVATE", actor.userId, userId);
  return user;
}
