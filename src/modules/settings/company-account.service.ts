import { CompanyAccountType, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma";

export const companyAccountSelect = {
  id: true,
  tenantId: true,
  hesapAdi: true,
  hesapTuru: true,
  bankaAdi: true,
  iban: true,
  hesapNo: true,
  paraBirimi: true,
  aciklama: true,
  aktifMi: true,
  createdAt: true,
  updatedAt: true,
} as const;

type CompanyAccountRow = Prisma.CompanyAccountGetPayload<{ select: typeof companyAccountSelect }>;

export type CompanyAccountDto = Omit<CompanyAccountRow, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

const accountTypes = ["BANKA", "KASA", "POS", "DIGER"] as const;

const companyAccountBodySchema = z.object({
  hesapAdi: z.string().trim().min(1, "Hesap adı gereklidir."),
  hesapTuru: z.enum(accountTypes, {
    errorMap: () => ({ message: "Geçerli bir hesap türü seçin." }),
  }),
  bankaAdi: z.string().trim().optional().or(z.literal("")),
  iban: z.string().trim().optional().or(z.literal("")),
  hesapNo: z.string().trim().optional().or(z.literal("")),
  paraBirimi: z.literal("TRY").optional(),
  aciklama: z.string().trim().optional().or(z.literal("")),
});

export const createCompanyAccountSchema = companyAccountBodySchema;

export const updateCompanyAccountSchema = companyAccountBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Güncellenecek alan bulunamadı." }
);

export const updateCompanyAccountStatusSchema = z.object({
  aktifMi: z.boolean({ required_error: "Durum bilgisi gereklidir." }),
});

function toNullableString(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function serializeCompanyAccount(record: CompanyAccountRow): CompanyAccountDto {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listCompanyAccounts(tenantId: string): Promise<CompanyAccountDto[]> {
  const records = await prisma.companyAccount.findMany({
    where: { tenantId },
    select: companyAccountSelect,
    orderBy: [{ aktifMi: "desc" }, { hesapAdi: "asc" }],
  });
  return records.map(serializeCompanyAccount);
}

export async function createCompanyAccount(
  tenantId: string,
  data: z.infer<typeof createCompanyAccountSchema>
): Promise<CompanyAccountDto> {
  const parsed = createCompanyAccountSchema.parse(data);

  const record = await prisma.companyAccount.create({
    data: {
      tenantId,
      hesapAdi: parsed.hesapAdi.trim(),
      hesapTuru: parsed.hesapTuru as CompanyAccountType,
      bankaAdi: toNullableString(parsed.bankaAdi) ?? null,
      iban: toNullableString(parsed.iban) ?? null,
      hesapNo: toNullableString(parsed.hesapNo) ?? null,
      paraBirimi: parsed.paraBirimi ?? "TRY",
      aciklama: toNullableString(parsed.aciklama) ?? null,
    },
    select: companyAccountSelect,
  });

  return serializeCompanyAccount(record);
}

export async function updateCompanyAccount(
  tenantId: string,
  id: string,
  data: z.infer<typeof updateCompanyAccountSchema>
): Promise<CompanyAccountDto> {
  const parsed = updateCompanyAccountSchema.parse(data);

  const existing = await prisma.companyAccount.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Banka/kasa hesabı bulunamadı.");

  const updateData: Prisma.CompanyAccountUpdateInput = {};
  if (parsed.hesapAdi !== undefined) updateData.hesapAdi = parsed.hesapAdi.trim();
  if (parsed.hesapTuru !== undefined) updateData.hesapTuru = parsed.hesapTuru as CompanyAccountType;
  if (parsed.bankaAdi !== undefined) updateData.bankaAdi = toNullableString(parsed.bankaAdi) ?? null;
  if (parsed.iban !== undefined) updateData.iban = toNullableString(parsed.iban) ?? null;
  if (parsed.hesapNo !== undefined) updateData.hesapNo = toNullableString(parsed.hesapNo) ?? null;
  if (parsed.paraBirimi !== undefined) updateData.paraBirimi = parsed.paraBirimi;
  if (parsed.aciklama !== undefined) updateData.aciklama = toNullableString(parsed.aciklama) ?? null;

  const record = await prisma.companyAccount.update({
    where: { id },
    data: updateData,
    select: companyAccountSelect,
  });

  return serializeCompanyAccount(record);
}

export async function updateCompanyAccountStatus(
  tenantId: string,
  id: string,
  data: z.infer<typeof updateCompanyAccountStatusSchema>
): Promise<CompanyAccountDto> {
  const parsed = updateCompanyAccountStatusSchema.parse(data);

  const existing = await prisma.companyAccount.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Banka/kasa hesabı bulunamadı.");

  const record = await prisma.companyAccount.update({
    where: { id },
    data: { aktifMi: parsed.aktifMi },
    select: companyAccountSelect,
  });

  return serializeCompanyAccount(record);
}

export async function resolveCompanyAccountForTransaction(
  tenantId: string,
  companyAccountId: string,
  options: { allowInactive?: boolean } = {}
): Promise<CompanyAccountRow> {
  const account = await prisma.companyAccount.findFirst({
    where: { id: companyAccountId, tenantId },
    select: companyAccountSelect,
  });
  if (!account) throw new Error("Banka/kasa hesabı bulunamadı.");
  if (!account.aktifMi && !options.allowInactive) {
    throw new Error("Pasif hesap yeni hareket için seçilemez.");
  }
  return account;
}
