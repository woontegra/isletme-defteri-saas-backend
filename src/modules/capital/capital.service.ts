import {
  PartnerCapitalTransactionType,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma";
import {
  companyAccountSelect,
  resolveCompanyAccountForTransaction,
  type CompanyAccountDto,
} from "../settings/company-account.service";

export type CapitalWarningStatus = "NORMAL" | "UYARI" | "LIMIT_ASILDI" | "BILGI_GEREKLI";

export const capitalSettingsSelect = {
  id: true,
  tenantId: true,
  sirketUnvani: true,
  kurulusTarihi: true,
  ticaretSicilGazeteTarihi: true,
  anaSermaye: true,
  ortakParaCarpani: true,
  uyariOrani: true,
  sonSermayeArtirimTarihi: true,
  notlar: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const capitalIncreaseSelect = {
  id: true,
  tenantId: true,
  tarih: true,
  oncekiSermaye: true,
  yeniSermaye: true,
  aciklama: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const partnerSelect = {
  id: true,
  tenantId: true,
  adSoyad: true,
  unvan: true,
  telefon: true,
  eposta: true,
  aktifMi: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const partnerTransactionSelect = {
  id: true,
  tenantId: true,
  partnerId: true,
  companyAccountId: true,
  tarih: true,
  ortakAdi: true,
  tur: true,
  aciklama: true,
  tutar: true,
  createdAt: true,
  updatedAt: true,
  partner: {
    select: partnerSelect,
  },
  companyAccount: {
    select: companyAccountSelect,
  },
} as const;

type CapitalSettingsRow = Prisma.CapitalSettingsGetPayload<{ select: typeof capitalSettingsSelect }>;
type CapitalIncreaseRow = Prisma.CapitalIncreaseRecordGetPayload<{ select: typeof capitalIncreaseSelect }>;
type CapitalPartnerRow = Prisma.CapitalPartnerGetPayload<{ select: typeof partnerSelect }>;
type PartnerTransactionRow = Prisma.PartnerCapitalTransactionGetPayload<{
  select: typeof partnerTransactionSelect;
}>;

export type CapitalSettingsDto = Omit<
  CapitalSettingsRow,
  | "kurulusTarihi"
  | "ticaretSicilGazeteTarihi"
  | "anaSermaye"
  | "ortakParaCarpani"
  | "uyariOrani"
  | "sonSermayeArtirimTarihi"
  | "createdAt"
  | "updatedAt"
> & {
  kurulusTarihi: string | null;
  ticaretSicilGazeteTarihi: string | null;
  anaSermaye: number;
  ortakParaCarpani: number;
  uyariOrani: number;
  sonSermayeArtirimTarihi: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CapitalIncreaseDto = Omit<
  CapitalIncreaseRow,
  "tarih" | "oncekiSermaye" | "yeniSermaye" | "createdAt" | "updatedAt"
> & {
  tarih: string;
  oncekiSermaye: number | null;
  yeniSermaye: number;
  createdAt: string;
  updatedAt: string;
};

export type CapitalPartnerDto = Omit<CapitalPartnerRow, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type PartnerCapitalTransactionDto = Omit<
  PartnerTransactionRow,
  "tarih" | "tutar" | "createdAt" | "updatedAt" | "partner" | "companyAccount"
> & {
  tarih: string;
  tutar: number;
  ortakAdi: string;
  partner: CapitalPartnerDto | null;
  companyAccount: CompanyAccountDto | null;
  createdAt: string;
  updatedAt: string;
};

export type CapitalSummaryDto = {
  anaSermaye: number;
  toplamAnaSermayeOdemesi: number;
  kalanAnaSermayeOdemesi: number;
  anaSermayeOdemeOrani: number;
  ortakParaLimiti: number;
  netOrtakAlacagi: number;
  kalanLimit: number;
  kullanimOrani: number;
  uyariEsigi: number;
  uyariDurumu: CapitalWarningStatus;
};

const transactionTypes = ["ANA_SERMAYE_ODEMESI", "PARA_KOYMA", "PARA_CEKME"] as const;

const updateCapitalSettingsSchema = z.object({
  sirketUnvani: z.string().trim().optional().or(z.literal("")),
  kurulusTarihi: z.coerce
    .date({ invalid_type_error: "Geçerli bir kuruluş tarihi girin." })
    .optional()
    .nullable(),
  ticaretSicilGazeteTarihi: z.coerce
    .date({ invalid_type_error: "Geçerli bir gazete tarihi girin." })
    .optional()
    .nullable(),
  anaSermaye: z.coerce
    .number({ invalid_type_error: "Ana sermaye sayısal olmalıdır." })
    .min(0, "Ana sermaye 0 veya daha büyük olmalıdır.")
    .optional(),
  ortakParaCarpani: z.coerce
    .number({ invalid_type_error: "Ortak para çarpanı sayısal olmalıdır." })
    .positive("Ortak para çarpanı 0'dan büyük olmalıdır.")
    .optional(),
  uyariOrani: z.coerce
    .number({ invalid_type_error: "Uyarı oranı sayısal olmalıdır." })
    .min(0, "Uyarı oranı 0 ile 1 arasında olmalıdır.")
    .max(1, "Uyarı oranı 0 ile 1 arasında olmalıdır.")
    .optional(),
  sonSermayeArtirimTarihi: z.coerce
    .date({ invalid_type_error: "Geçerli bir sermaye artırım tarihi girin." })
    .optional()
    .nullable(),
  notlar: z.string().trim().optional().or(z.literal("")),
});

export const updateCapitalSettingsBodySchema = updateCapitalSettingsSchema.refine(
  (data) => Object.keys(data).length > 0,
  { message: "Güncellenecek alan bulunamadı." }
);

const capitalIncreaseBodySchema = z.object({
  tarih: z.coerce.date({ invalid_type_error: "Geçerli bir tarih girin." }),
  oncekiSermaye: z.coerce
    .number({ invalid_type_error: "Önceki sermaye sayısal olmalıdır." })
    .min(0, "Önceki sermaye 0 veya daha büyük olmalıdır.")
    .optional()
    .nullable(),
  yeniSermaye: z.coerce
    .number({ invalid_type_error: "Yeni sermaye sayısal olmalıdır." })
    .positive("Yeni sermaye 0'dan büyük olmalıdır."),
  aciklama: z.string().trim().optional().or(z.literal("")),
});

export const createCapitalIncreaseSchema = capitalIncreaseBodySchema;

export const updateCapitalIncreaseSchema = capitalIncreaseBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Güncellenecek alan bulunamadı." }
);

const partnerBodySchema = z.object({
  adSoyad: z.string().trim().min(1, "Ad soyad gereklidir."),
  unvan: z.string().trim().optional().or(z.literal("")),
  telefon: z.string().trim().optional().or(z.literal("")),
  eposta: z
    .union([z.literal(""), z.string().trim().email("Geçerli bir e-posta adresi girin.")])
    .optional(),
});

export const createCapitalPartnerSchema = partnerBodySchema;

export const updateCapitalPartnerSchema = partnerBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Güncellenecek alan bulunamadı." }
);

export const updateCapitalPartnerStatusSchema = z.object({
  aktifMi: z.boolean({ required_error: "Durum bilgisi gereklidir." }),
});

const partnerTransactionBodySchema = z.object({
  tarih: z.coerce.date({ invalid_type_error: "Geçerli bir tarih girin." }),
  partnerId: z.string().trim().min(1, "Ortak seçimi gereklidir."),
  companyAccountId: z.string().trim().min(1).optional().nullable(),
  tur: z.enum(transactionTypes, {
    errorMap: () => ({ message: "Geçerli bir işlem türü seçin." }),
  }),
  aciklama: z.string().trim().optional().or(z.literal("")),
  tutar: z.coerce
    .number({ invalid_type_error: "Tutar sayısal olmalıdır." })
    .positive("Tutar 0'dan büyük olmalıdır."),
});

export const createPartnerTransactionSchema = partnerTransactionBodySchema;

export const updatePartnerTransactionSchema = partnerTransactionBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Güncellenecek alan bulunamadı." }
);

function toNullableString(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function serializeSettings(record: CapitalSettingsRow): CapitalSettingsDto {
  return {
    ...record,
    kurulusTarihi: record.kurulusTarihi ? record.kurulusTarihi.toISOString() : null,
    ticaretSicilGazeteTarihi: record.ticaretSicilGazeteTarihi
      ? record.ticaretSicilGazeteTarihi.toISOString()
      : null,
    anaSermaye: Number(record.anaSermaye),
    ortakParaCarpani: Number(record.ortakParaCarpani),
    uyariOrani: Number(record.uyariOrani),
    sonSermayeArtirimTarihi: record.sonSermayeArtirimTarihi
      ? record.sonSermayeArtirimTarihi.toISOString()
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function serializeIncrease(record: CapitalIncreaseRow): CapitalIncreaseDto {
  return {
    ...record,
    tarih: record.tarih.toISOString(),
    oncekiSermaye: record.oncekiSermaye !== null ? Number(record.oncekiSermaye) : null,
    yeniSermaye: Number(record.yeniSermaye),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function serializePartner(record: CapitalPartnerRow): CapitalPartnerDto {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function serializePartnerTransaction(record: PartnerTransactionRow): PartnerCapitalTransactionDto {
  const partner = record.partner ? serializePartner(record.partner) : null;
  const companyAccount = record.companyAccount
    ? {
        ...record.companyAccount,
        createdAt: record.companyAccount.createdAt.toISOString(),
        updatedAt: record.companyAccount.updatedAt.toISOString(),
      }
    : null;
  return {
    id: record.id,
    tenantId: record.tenantId,
    partnerId: record.partnerId,
    companyAccountId: record.companyAccountId,
    tarih: record.tarih.toISOString(),
    ortakAdi: partner?.adSoyad ?? record.ortakAdi,
    tur: record.tur,
    aciklama: record.aciklama,
    tutar: Number(record.tutar),
    partner,
    companyAccount,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function resolvePartnerForTransaction(
  tenantId: string,
  partnerId: string,
  options: { allowInactive?: boolean } = {}
): Promise<CapitalPartnerRow> {
  const partner = await prisma.capitalPartner.findFirst({
    where: { id: partnerId, tenantId },
    select: partnerSelect,
  });
  if (!partner) throw new Error("Ortak bulunamadı.");
  if (!partner.aktifMi && !options.allowInactive) {
    throw new Error("Pasif ortak yeni hareket için seçilemez.");
  }
  return partner;
}

function defaultSettingsDto(tenantId: string): CapitalSettingsDto {
  const now = new Date().toISOString();
  return {
    id: "",
    tenantId,
    sirketUnvani: null,
    kurulusTarihi: null,
    ticaretSicilGazeteTarihi: null,
    anaSermaye: 0,
    ortakParaCarpani: 3,
    uyariOrani: 0.8,
    sonSermayeArtirimTarihi: null,
    notlar: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function getOrCreateSettingsRow(tenantId: string): Promise<CapitalSettingsRow> {
  const existing = await prisma.capitalSettings.findUnique({
    where: { tenantId },
    select: capitalSettingsSelect,
  });
  if (existing) return existing;

  return prisma.capitalSettings.create({
    data: { tenantId },
    select: capitalSettingsSelect,
  });
}

function computeWarningStatus(
  anaSermaye: number,
  netOrtakAlacagi: number,
  ortakParaLimiti: number,
  uyariOrani: number
): CapitalWarningStatus {
  if (anaSermaye <= 0 || ortakParaLimiti <= 0) return "BILGI_GEREKLI";
  if (netOrtakAlacagi >= ortakParaLimiti) return "LIMIT_ASILDI";

  const safeUyariOrani = Number.isFinite(uyariOrani) ? uyariOrani : 0;
  if (safeUyariOrani > 0 && netOrtakAlacagi >= ortakParaLimiti * safeUyariOrani) {
    return "UYARI";
  }

  return "NORMAL";
}

function safeUsageRatio(netOrtakAlacagi: number, ortakParaLimiti: number): number {
  if (ortakParaLimiti <= 0 || !Number.isFinite(netOrtakAlacagi) || !Number.isFinite(ortakParaLimiti)) {
    return 0;
  }
  const ratio = netOrtakAlacagi / ortakParaLimiti;
  return Number.isFinite(ratio) ? ratio : 0;
}

export async function getCapitalSettings(tenantId: string): Promise<CapitalSettingsDto> {
  const record = await prisma.capitalSettings.findUnique({
    where: { tenantId },
    select: capitalSettingsSelect,
  });
  if (!record) return defaultSettingsDto(tenantId);
  return serializeSettings(record);
}

export async function updateCapitalSettings(
  tenantId: string,
  data: z.infer<typeof updateCapitalSettingsBodySchema>
): Promise<CapitalSettingsDto> {
  const parsed = updateCapitalSettingsBodySchema.parse(data);

  const updateData: Prisma.CapitalSettingsUpdateInput = {};

  if (parsed.sirketUnvani !== undefined) {
    updateData.sirketUnvani = toNullableString(parsed.sirketUnvani) ?? null;
  }
  if (parsed.kurulusTarihi !== undefined) updateData.kurulusTarihi = parsed.kurulusTarihi;
  if (parsed.ticaretSicilGazeteTarihi !== undefined) {
    updateData.ticaretSicilGazeteTarihi = parsed.ticaretSicilGazeteTarihi;
  }
  if (parsed.anaSermaye !== undefined) updateData.anaSermaye = parsed.anaSermaye;
  if (parsed.ortakParaCarpani !== undefined) updateData.ortakParaCarpani = parsed.ortakParaCarpani;
  if (parsed.uyariOrani !== undefined) updateData.uyariOrani = parsed.uyariOrani;
  if (parsed.sonSermayeArtirimTarihi !== undefined) {
    updateData.sonSermayeArtirimTarihi = parsed.sonSermayeArtirimTarihi;
  }
  if (parsed.notlar !== undefined) updateData.notlar = toNullableString(parsed.notlar) ?? null;

  const record = await prisma.capitalSettings.upsert({
    where: { tenantId },
    create: {
      tenantId,
      sirketUnvani: toNullableString(parsed.sirketUnvani) ?? null,
      kurulusTarihi: parsed.kurulusTarihi ?? null,
      ticaretSicilGazeteTarihi: parsed.ticaretSicilGazeteTarihi ?? null,
      anaSermaye: parsed.anaSermaye ?? 0,
      ortakParaCarpani: parsed.ortakParaCarpani ?? 3,
      uyariOrani: parsed.uyariOrani ?? 0.8,
      sonSermayeArtirimTarihi: parsed.sonSermayeArtirimTarihi ?? null,
      notlar: toNullableString(parsed.notlar) ?? null,
    },
    update: updateData,
    select: capitalSettingsSelect,
  });

  return serializeSettings(record);
}

export async function listCapitalIncreases(tenantId: string): Promise<CapitalIncreaseDto[]> {
  const records = await prisma.capitalIncreaseRecord.findMany({
    where: { tenantId },
    select: capitalIncreaseSelect,
    orderBy: [{ tarih: "desc" }, { createdAt: "desc" }],
  });
  return records.map(serializeIncrease);
}

export async function createCapitalIncrease(
  tenantId: string,
  data: z.infer<typeof createCapitalIncreaseSchema>
): Promise<CapitalIncreaseDto> {
  const parsed = createCapitalIncreaseSchema.parse(data);

  const record = await prisma.$transaction(async (tx) => {
    const increase = await tx.capitalIncreaseRecord.create({
      data: {
        tenantId,
        tarih: parsed.tarih,
        oncekiSermaye: parsed.oncekiSermaye ?? null,
        yeniSermaye: parsed.yeniSermaye,
        aciklama: toNullableString(parsed.aciklama) ?? null,
      },
      select: capitalIncreaseSelect,
    });

    await tx.capitalSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        anaSermaye: parsed.yeniSermaye,
        sonSermayeArtirimTarihi: parsed.tarih,
      },
      update: {
        anaSermaye: parsed.yeniSermaye,
        sonSermayeArtirimTarihi: parsed.tarih,
      },
    });

    return increase;
  });

  return serializeIncrease(record);
}

export async function updateCapitalIncrease(
  tenantId: string,
  id: string,
  data: z.infer<typeof updateCapitalIncreaseSchema>
): Promise<CapitalIncreaseDto> {
  const parsed = updateCapitalIncreaseSchema.parse(data);

  const existing = await prisma.capitalIncreaseRecord.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Sermaye artırım kaydı bulunamadı.");

  const updateData: Prisma.CapitalIncreaseRecordUpdateInput = {};
  if (parsed.tarih !== undefined) updateData.tarih = parsed.tarih;
  if (parsed.oncekiSermaye !== undefined) updateData.oncekiSermaye = parsed.oncekiSermaye;
  if (parsed.yeniSermaye !== undefined) updateData.yeniSermaye = parsed.yeniSermaye;
  if (parsed.aciklama !== undefined) updateData.aciklama = toNullableString(parsed.aciklama) ?? null;

  const record = await prisma.capitalIncreaseRecord.update({
    where: { id },
    data: updateData,
    select: capitalIncreaseSelect,
  });

  return serializeIncrease(record);
}

export async function deleteCapitalIncrease(tenantId: string, id: string): Promise<void> {
  const result = await prisma.capitalIncreaseRecord.deleteMany({
    where: { id, tenantId },
  });
  if (result.count === 0) throw new Error("Sermaye artırım kaydı bulunamadı.");
}

export async function listCapitalPartners(tenantId: string): Promise<CapitalPartnerDto[]> {
  const records = await prisma.capitalPartner.findMany({
    where: { tenantId },
    select: partnerSelect,
    orderBy: [{ aktifMi: "desc" }, { adSoyad: "asc" }],
  });
  return records.map(serializePartner);
}

export async function createCapitalPartner(
  tenantId: string,
  data: z.infer<typeof createCapitalPartnerSchema>
): Promise<CapitalPartnerDto> {
  const parsed = createCapitalPartnerSchema.parse(data);

  const record = await prisma.capitalPartner.create({
    data: {
      tenantId,
      adSoyad: parsed.adSoyad.trim(),
      unvan: toNullableString(parsed.unvan) ?? null,
      telefon: toNullableString(parsed.telefon) ?? null,
      eposta: toNullableString(parsed.eposta) ?? null,
    },
    select: partnerSelect,
  });

  return serializePartner(record);
}

export async function updateCapitalPartner(
  tenantId: string,
  id: string,
  data: z.infer<typeof updateCapitalPartnerSchema>
): Promise<CapitalPartnerDto> {
  const parsed = updateCapitalPartnerSchema.parse(data);

  const existing = await prisma.capitalPartner.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Ortak bulunamadı.");

  const updateData: Prisma.CapitalPartnerUpdateInput = {};
  if (parsed.adSoyad !== undefined) updateData.adSoyad = parsed.adSoyad.trim();
  if (parsed.unvan !== undefined) updateData.unvan = toNullableString(parsed.unvan) ?? null;
  if (parsed.telefon !== undefined) updateData.telefon = toNullableString(parsed.telefon) ?? null;
  if (parsed.eposta !== undefined) updateData.eposta = toNullableString(parsed.eposta) ?? null;

  const record = await prisma.capitalPartner.update({
    where: { id },
    data: updateData,
    select: partnerSelect,
  });

  if (parsed.adSoyad !== undefined) {
    await prisma.partnerCapitalTransaction.updateMany({
      where: { tenantId, partnerId: id },
      data: { ortakAdi: parsed.adSoyad.trim() },
    });
  }

  return serializePartner(record);
}

export async function updateCapitalPartnerStatus(
  tenantId: string,
  id: string,
  data: z.infer<typeof updateCapitalPartnerStatusSchema>
): Promise<CapitalPartnerDto> {
  const parsed = updateCapitalPartnerStatusSchema.parse(data);

  const existing = await prisma.capitalPartner.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Ortak bulunamadı.");

  const record = await prisma.capitalPartner.update({
    where: { id },
    data: { aktifMi: parsed.aktifMi },
    select: partnerSelect,
  });

  return serializePartner(record);
}

export async function listPartnerCapitalTransactions(
  tenantId: string
): Promise<PartnerCapitalTransactionDto[]> {
  const records = await prisma.partnerCapitalTransaction.findMany({
    where: { tenantId },
    select: partnerTransactionSelect,
    orderBy: [{ tarih: "desc" }, { createdAt: "desc" }],
  });
  return records.map(serializePartnerTransaction);
}

export async function createPartnerCapitalTransaction(
  tenantId: string,
  data: z.infer<typeof createPartnerTransactionSchema>
): Promise<PartnerCapitalTransactionDto> {
  const parsed = createPartnerTransactionSchema.parse(data);
  const partner = await resolvePartnerForTransaction(tenantId, parsed.partnerId);

  let companyAccountId: string | null = null;
  if (parsed.companyAccountId) {
    const account = await resolveCompanyAccountForTransaction(tenantId, parsed.companyAccountId);
    companyAccountId = account.id;
  }

  const record = await prisma.partnerCapitalTransaction.create({
    data: {
      tenantId,
      partnerId: partner.id,
      companyAccountId,
      tarih: parsed.tarih,
      ortakAdi: partner.adSoyad,
      tur: parsed.tur as PartnerCapitalTransactionType,
      aciklama: toNullableString(parsed.aciklama) ?? null,
      tutar: parsed.tutar,
    },
    select: partnerTransactionSelect,
  });

  return serializePartnerTransaction(record);
}

export async function updatePartnerCapitalTransaction(
  tenantId: string,
  id: string,
  data: z.infer<typeof updatePartnerTransactionSchema>
): Promise<PartnerCapitalTransactionDto> {
  const parsed = updatePartnerTransactionSchema.parse(data);

  const existing = await prisma.partnerCapitalTransaction.findFirst({
    where: { id, tenantId },
    select: { id: true, partnerId: true, companyAccountId: true },
  });
  if (!existing) throw new Error("Ortak para hareketi bulunamadı.");

  const updateData: Prisma.PartnerCapitalTransactionUpdateInput = {};
  if (parsed.tarih !== undefined) updateData.tarih = parsed.tarih;
  if (parsed.tur !== undefined) updateData.tur = parsed.tur as PartnerCapitalTransactionType;
  if (parsed.aciklama !== undefined) updateData.aciklama = toNullableString(parsed.aciklama) ?? null;
  if (parsed.tutar !== undefined) updateData.tutar = parsed.tutar;
  if (parsed.partnerId !== undefined) {
    const partner = await resolvePartnerForTransaction(tenantId, parsed.partnerId, {
      allowInactive: existing.partnerId === parsed.partnerId,
    });
    updateData.partner = { connect: { id: partner.id } };
    updateData.ortakAdi = partner.adSoyad;
  }
  if (parsed.companyAccountId !== undefined) {
    if (parsed.companyAccountId === null || parsed.companyAccountId === "") {
      updateData.companyAccount = { disconnect: true };
    } else {
      const account = await resolveCompanyAccountForTransaction(tenantId, parsed.companyAccountId, {
        allowInactive: existing.companyAccountId === parsed.companyAccountId,
      });
      updateData.companyAccount = { connect: { id: account.id } };
    }
  }

  const record = await prisma.partnerCapitalTransaction.update({
    where: { id },
    data: updateData,
    select: partnerTransactionSelect,
  });

  return serializePartnerTransaction(record);
}

export async function deletePartnerCapitalTransaction(tenantId: string, id: string): Promise<void> {
  const result = await prisma.partnerCapitalTransaction.deleteMany({
    where: { id, tenantId },
  });
  if (result.count === 0) throw new Error("Ortak para hareketi bulunamadı.");
}

export async function getCapitalSummary(tenantId: string): Promise<CapitalSummaryDto> {
  const settings = await getOrCreateSettingsRow(tenantId);

  const transactions = await prisma.partnerCapitalTransaction.findMany({
    where: { tenantId },
    select: { tur: true, tutar: true },
  });

  const anaSermaye = Number(settings.anaSermaye);
  const ortakParaCarpani = Number(settings.ortakParaCarpani);
  const uyariOrani = Number(settings.uyariOrani);

  const toplamAnaSermayeOdemesi = transactions
    .filter((t) => t.tur === "ANA_SERMAYE_ODEMESI")
    .reduce((sum, t) => sum + Number(t.tutar), 0);
  const toplamKoyma = transactions
    .filter((t) => t.tur === "PARA_KOYMA")
    .reduce((sum, t) => sum + Number(t.tutar), 0);
  const toplamCekme = transactions
    .filter((t) => t.tur === "PARA_CEKME")
    .reduce((sum, t) => sum + Number(t.tutar), 0);

  const netOrtakAlacagi = toplamKoyma - toplamCekme;
  const ortakParaLimiti = anaSermaye * ortakParaCarpani;
  const kalanAnaSermayeOdemesi = Math.max(anaSermaye - toplamAnaSermayeOdemesi, 0);
  const anaSermayeOdemeOrani =
    anaSermaye > 0 ? toplamAnaSermayeOdemesi / anaSermaye : 0;

  const baseSummary = {
    anaSermaye,
    toplamAnaSermayeOdemesi,
    kalanAnaSermayeOdemesi,
    anaSermayeOdemeOrani,
    netOrtakAlacagi,
  };

  if (anaSermaye <= 0 || ortakParaLimiti <= 0) {
    return {
      ...baseSummary,
      ortakParaLimiti: 0,
      kalanLimit: 0,
      kullanimOrani: 0,
      uyariEsigi: 0,
      uyariDurumu: "BILGI_GEREKLI",
    };
  }

  const kalanLimit = ortakParaLimiti - netOrtakAlacagi;
  const safeUyariOrani = Number.isFinite(uyariOrani) ? uyariOrani : 0;
  const uyariEsigi = ortakParaLimiti * safeUyariOrani;
  const kullanimOrani = safeUsageRatio(netOrtakAlacagi, ortakParaLimiti);

  return {
    ...baseSummary,
    ortakParaLimiti,
    kalanLimit,
    kullanimOrani,
    uyariEsigi,
    uyariDurumu: computeWarningStatus(
      anaSermaye,
      netOrtakAlacagi,
      ortakParaLimiti,
      safeUyariOrani
    ),
  };
}
