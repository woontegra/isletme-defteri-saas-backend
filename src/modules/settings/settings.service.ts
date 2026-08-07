import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma";
import { AuthContext } from "../../middleware/auth";
import { hashPassword, verifyPassword } from "../../utils/password";
import { auditLog } from "../../utils/audit";

const APP_NAME = "Woontegra İşletme Defteri";
const APP_VERSION = "0.1.0";

const tenantSettingsSelect = {
  id: true,
  tenantId: true,
  firmaUnvani: true,
  vergiDairesi: true,
  vergiNo: true,
  mersisNo: true,
  ticaretSicilNo: true,
  telefon: true,
  eposta: true,
  website: true,
  adres: true,
  sehir: true,
  ilce: true,
  postaKodu: true,
  varsayilanParaBirimi: true,
  tarihFormati: true,
  saatDilimi: true,
  createdAt: true,
  updatedAt: true,
} as const;

const accountSelect = {
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

const optionalString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v));

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => v === "" || z.string().email().safeParse(v).success, {
    message: "Geçerli bir e-posta adresi girin.",
  })
  .transform((v) => (v === "" ? undefined : v));

export const updateCompanySettingsSchema = z.object({
  firmaUnvani: optionalString,
  vergiDairesi: optionalString,
  vergiNo: optionalString,
  mersisNo: optionalString,
  ticaretSicilNo: optionalString,
  telefon: optionalString,
  eposta: optionalEmail,
  website: optionalString,
  adres: optionalString,
  sehir: optionalString,
  ilce: optionalString,
  postaKodu: optionalString,
  varsayilanParaBirimi: z.literal("TRY").optional(),
  tarihFormati: z.literal("DD.MM.YYYY").optional(),
  saatDilimi: z.literal("Europe/Istanbul").optional(),
});

export const updateAccountSettingsSchema = z.object({
  adSoyad: z.string().trim().min(1, "Ad soyad gereklidir."),
  telefon: z.string().trim().optional().or(z.literal("")),
});

export const changePasswordSchema = z.object({
  mevcutSifre: z.string().min(1, "Mevcut şifre gereklidir."),
  yeniSifre: z.string().min(8, "Yeni şifre en az 8 karakter olmalıdır."),
});

export type CompanySettingsDto = {
  id: string;
  tenantId: string;
  firmaUnvani: string | null;
  vergiDairesi: string | null;
  vergiNo: string | null;
  mersisNo: string | null;
  ticaretSicilNo: string | null;
  telefon: string | null;
  eposta: string | null;
  website: string | null;
  adres: string | null;
  sehir: string | null;
  ilce: string | null;
  postaKodu: string | null;
  varsayilanParaBirimi: string;
  tarihFormati: string;
  saatDilimi: string;
  createdAt: string;
  updatedAt: string;
};

export type AccountSettingsDto = {
  id: string;
  adSoyad: string;
  kullaniciAdi: string;
  eposta: string;
  telefon: string | null;
  rol: UserRole;
  aktifMi: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SystemInfoDto = {
  uygulamaAdi: string;
  surum: string;
  ortam: string;
  calismaModu: string;
  tenantAdi: string;
  kullaniciRolu: UserRole;
  apiDurumu: string;
  apiCalismaZamani: string;
};

function serializeCompanySettings(row: {
  id: string;
  tenantId: string;
  firmaUnvani: string | null;
  vergiDairesi: string | null;
  vergiNo: string | null;
  mersisNo: string | null;
  ticaretSicilNo: string | null;
  telefon: string | null;
  eposta: string | null;
  website: string | null;
  adres: string | null;
  sehir: string | null;
  ilce: string | null;
  postaKodu: string | null;
  varsayilanParaBirimi: string;
  tarihFormati: string;
  saatDilimi: string;
  createdAt: Date;
  updatedAt: Date;
}): CompanySettingsDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    firmaUnvani: row.firmaUnvani,
    vergiDairesi: row.vergiDairesi,
    vergiNo: row.vergiNo,
    mersisNo: row.mersisNo,
    ticaretSicilNo: row.ticaretSicilNo,
    telefon: row.telefon,
    eposta: row.eposta,
    website: row.website,
    adres: row.adres,
    sehir: row.sehir,
    ilce: row.ilce,
    postaKodu: row.postaKodu,
    varsayilanParaBirimi: row.varsayilanParaBirimi,
    tarihFormati: row.tarihFormati,
    saatDilimi: row.saatDilimi,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeAccount(user: {
  id: string;
  adSoyad: string;
  kullaniciAdi: string;
  eposta: string;
  telefon: string | null;
  rol: UserRole;
  aktifMi: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AccountSettingsDto {
  return {
    id: user.id,
    adSoyad: user.adSoyad,
    kullaniciAdi: user.kullaniciAdi,
    eposta: user.eposta,
    telefon: user.telefon,
    rol: user.rol,
    aktifMi: user.aktifMi,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function assertCanEditCompany(actor: AuthContext) {
  if (actor.rol !== "SIRKET_SAHIBI" && actor.rol !== "YONETICI") {
    throw new Error("Şirket ayarlarını güncelleme yetkiniz yok.");
  }
}

async function getOrCreateTenantSettings(tenantId: string) {
  const existing = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: tenantSettingsSelect,
  });
  if (existing) return existing;

  return prisma.tenantSettings.create({
    data: { tenantId },
    select: tenantSettingsSelect,
  });
}

export async function getCompanySettings(tenantId: string): Promise<CompanySettingsDto> {
  const record = await getOrCreateTenantSettings(tenantId);
  return serializeCompanySettings(record);
}

export async function updateCompanySettings(
  tenantId: string,
  actor: AuthContext,
  data: z.infer<typeof updateCompanySettingsSchema>
): Promise<CompanySettingsDto> {
  assertCanEditCompany(actor);
  const parsed = updateCompanySettingsSchema.parse(data);

  await getOrCreateTenantSettings(tenantId);

  const updateData: Record<string, string | null | undefined> = {};

  const nullableFields = [
    "firmaUnvani",
    "vergiDairesi",
    "vergiNo",
    "mersisNo",
    "ticaretSicilNo",
    "telefon",
    "eposta",
    "website",
    "adres",
    "sehir",
    "ilce",
    "postaKodu",
  ] as const;

  for (const field of nullableFields) {
    if (parsed[field] !== undefined) {
      updateData[field] = parsed[field] ?? null;
    }
  }

  if (parsed.varsayilanParaBirimi !== undefined) {
    updateData.varsayilanParaBirimi = parsed.varsayilanParaBirimi;
  }
  if (parsed.tarihFormati !== undefined) {
    updateData.tarihFormati = parsed.tarihFormati;
  }
  if (parsed.saatDilimi !== undefined) {
    updateData.saatDilimi = parsed.saatDilimi;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("Güncellenecek alan bulunamadı.");
  }

  const record = await prisma.tenantSettings.update({
    where: { tenantId },
    data: updateData,
    select: tenantSettingsSelect,
  });

  auditLog("SETTINGS_COMPANY_UPDATE", actor.userId, tenantId, {
    fields: Object.keys(updateData),
  });

  return serializeCompanySettings(record);
}

export async function getAccountSettings(
  tenantId: string,
  userId: string
): Promise<AccountSettingsDto> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: accountSelect,
  });
  if (!user) throw new Error("Kullanıcı bulunamadı.");
  return serializeAccount(user);
}

export async function updateAccountSettings(
  tenantId: string,
  actor: AuthContext,
  data: z.infer<typeof updateAccountSettingsSchema>
): Promise<AccountSettingsDto> {
  const parsed = updateAccountSettingsSchema.parse(data);

  const existing = await prisma.user.findFirst({
    where: { id: actor.userId, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Kullanıcı bulunamadı.");

  const user = await prisma.user.update({
    where: { id: actor.userId },
    data: {
      adSoyad: parsed.adSoyad,
      telefon: parsed.telefon || null,
    },
    select: accountSelect,
  });

  auditLog("SETTINGS_ACCOUNT_UPDATE", actor.userId, actor.userId, {
    fields: ["adSoyad", "telefon"],
  });

  return serializeAccount(user);
}

export async function changePassword(
  tenantId: string,
  actor: AuthContext,
  data: z.infer<typeof changePasswordSchema>
): Promise<void> {
  const parsed = changePasswordSchema.parse(data);

  const user = await prisma.user.findFirst({
    where: { id: actor.userId, tenantId },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw new Error("Kullanıcı bulunamadı.");

  const valid = await verifyPassword(parsed.mevcutSifre, user.passwordHash);
  if (!valid) {
    throw new Error("Mevcut şifre hatalı.");
  }

  const passwordHash = await hashPassword(parsed.yeniSifre);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  auditLog("SETTINGS_PASSWORD_CHANGE", actor.userId, actor.userId);
}

export async function getSystemInfo(
  tenantId: string,
  actor: AuthContext
): Promise<SystemInfoDto> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId },
    select: { name: true },
  });
  if (!tenant) throw new Error("İşletme bulunamadı.");

  return {
    uygulamaAdi: APP_NAME,
    surum: APP_VERSION,
    ortam: process.env.NODE_ENV === "production" ? "production" : "development",
    calismaModu: "SaaS",
    tenantAdi: tenant.name,
    kullaniciRolu: actor.rol,
    apiDurumu: "aktif",
    apiCalismaZamani: new Date().toISOString(),
  };
}
