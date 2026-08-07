import { IncomeCollectionStatus, IncomeSaleType, Prisma } from "@prisma/client";
import { z } from "zod";
import { buildIncomeExpenseWhere, type ModulePeriodQuery } from "../../lib/module-period";
import { prisma } from "../../prisma";

export const incomeSelect = {
  id: true,
  tenantId: true,
  tarih: true,
  projeMarka: true,
  urunHizmet: true,
  musteri: true,
  satisTuru: true,
  donemPaket: true,
  aciklama: true,
  tutar: true,
  tahsilDurumu: true,
  faturaKesildiMi: true,
  createdAt: true,
  updatedAt: true,
} as const;

type IncomeRow = Prisma.IncomeRecordGetPayload<{ select: typeof incomeSelect }>;

export type IncomeDto = Omit<IncomeRow, "tutar" | "tarih" | "createdAt" | "updatedAt"> & {
  tutar: number;
  tarih: string;
  createdAt: string;
  updatedAt: string;
};

const collectionStatuses = ["TAHSIL_EDILDI", "BEKLIYOR"] as const;
const saleTypes = ["YAZILIM_ABONELIK", "YAZILIM_LISANS", "HIZMET", "DANISMANLIK", "EGITIM", "DIGER"] as const;

const incomeBodySchema = z.object({
  tarih: z.coerce.date({ invalid_type_error: "Geçerli bir tarih girin." }),
  projeMarka: z.string().trim().optional().or(z.literal("")),
  urunHizmet: z.string().trim().optional().or(z.literal("")),
  musteri: z.string().trim().optional().or(z.literal("")),
  satisTuru: z.enum(saleTypes, {
    errorMap: () => ({ message: "Geçerli bir satış türü seçin." }),
  }).optional().nullable(),
  donemPaket: z.string().trim().optional().or(z.literal("")),
  aciklama: z.string().trim().optional().or(z.literal("")),
  tutar: z.coerce.number({ invalid_type_error: "Tutar sayısal olmalıdır." }).positive("Tutar 0'dan büyük olmalıdır."),
  tahsilDurumu: z.enum(collectionStatuses, {
    errorMap: () => ({ message: "Geçerli bir tahsil durumu seçin." }),
  }),
  faturaKesildiMi: z.boolean().default(false),
});

export const createIncomeSchema = incomeBodySchema;

export const updateIncomeSchema = incomeBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Güncellenecek alan bulunamadı." }
);

function serializeIncome(record: IncomeRow): IncomeDto {
  return {
    ...record,
    tutar: Number(record.tutar),
    tarih: record.tarih.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toNullableString(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function listIncomes(
  tenantId: string,
  periodQuery: ModulePeriodQuery
): Promise<IncomeDto[]> {
  const records = await prisma.incomeRecord.findMany({
    where: buildIncomeExpenseWhere(tenantId, periodQuery),
    select: incomeSelect,
    orderBy: [{ tarih: "desc" }, { createdAt: "desc" }],
  });
  return records.map(serializeIncome);
}

export async function getIncome(tenantId: string, id: string): Promise<IncomeDto> {
  const record = await prisma.incomeRecord.findFirst({
    where: { id, tenantId },
    select: incomeSelect,
  });
  if (!record) throw new Error("Gelir kaydı bulunamadı.");
  return serializeIncome(record);
}

export async function createIncome(
  tenantId: string,
  data: z.infer<typeof createIncomeSchema>
): Promise<IncomeDto> {
  const parsed = createIncomeSchema.parse(data);

  const record = await prisma.incomeRecord.create({
    data: {
      tenantId,
      tarih: parsed.tarih,
      projeMarka: toNullableString(parsed.projeMarka) ?? null,
      urunHizmet: toNullableString(parsed.urunHizmet) ?? null,
      musteri: toNullableString(parsed.musteri) ?? null,
      satisTuru: (parsed.satisTuru as IncomeSaleType | null | undefined) ?? null,
      donemPaket: toNullableString(parsed.donemPaket) ?? null,
      aciklama: toNullableString(parsed.aciklama) ?? null,
      tutar: parsed.tutar,
      tahsilDurumu: parsed.tahsilDurumu as IncomeCollectionStatus,
      faturaKesildiMi: parsed.faturaKesildiMi,
    },
    select: incomeSelect,
  });

  return serializeIncome(record);
}

export async function updateIncome(
  tenantId: string,
  id: string,
  data: z.infer<typeof updateIncomeSchema>
): Promise<IncomeDto> {
  const parsed = updateIncomeSchema.parse(data);

  const existing = await prisma.incomeRecord.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Gelir kaydı bulunamadı.");

  const updateData: Prisma.IncomeRecordUpdateInput = {};

  if (parsed.tarih !== undefined) updateData.tarih = parsed.tarih;
  if (parsed.projeMarka !== undefined) updateData.projeMarka = toNullableString(parsed.projeMarka) ?? null;
  if (parsed.urunHizmet !== undefined) updateData.urunHizmet = toNullableString(parsed.urunHizmet) ?? null;
  if (parsed.musteri !== undefined) updateData.musteri = toNullableString(parsed.musteri) ?? null;
  if (parsed.satisTuru !== undefined) {
    updateData.satisTuru = (parsed.satisTuru as IncomeSaleType | null) ?? null;
  }
  if (parsed.donemPaket !== undefined) updateData.donemPaket = toNullableString(parsed.donemPaket) ?? null;
  if (parsed.aciklama !== undefined) updateData.aciklama = toNullableString(parsed.aciklama) ?? null;
  if (parsed.tutar !== undefined) updateData.tutar = parsed.tutar;
  if (parsed.tahsilDurumu !== undefined) {
    updateData.tahsilDurumu = parsed.tahsilDurumu as IncomeCollectionStatus;
  }
  if (parsed.faturaKesildiMi !== undefined) updateData.faturaKesildiMi = parsed.faturaKesildiMi;

  const record = await prisma.incomeRecord.update({
    where: { id },
    data: updateData,
    select: incomeSelect,
  });

  return serializeIncome(record);
}

export async function deleteIncome(tenantId: string, id: string): Promise<void> {
  const result = await prisma.incomeRecord.deleteMany({
    where: { id, tenantId },
  });
  if (result.count === 0) throw new Error("Gelir kaydı bulunamadı.");
}
