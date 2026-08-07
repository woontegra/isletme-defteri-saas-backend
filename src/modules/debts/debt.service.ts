import { DebtRecordStatus, DebtRecordType, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma";

export const debtSelect = {
  id: true,
  tenantId: true,
  tur: true,
  kisiFirma: true,
  projeMarka: true,
  aciklama: true,
  tutar: true,
  vadeTarihi: true,
  durum: true,
  createdAt: true,
  updatedAt: true,
} as const;

type DebtRow = Prisma.DebtRecordGetPayload<{ select: typeof debtSelect }>;

export type DebtDto = Omit<
  DebtRow,
  "tutar" | "vadeTarihi" | "createdAt" | "updatedAt"
> & {
  tutar: number;
  vadeTarihi: string | null;
  createdAt: string;
  updatedAt: string;
};

const debtTypes = ["BORC", "ALACAK"] as const;
const debtStatuses = ["ACIK", "KAPANDI", "IPTAL"] as const;

const debtBodySchema = z.object({
  tur: z.enum(debtTypes, {
    errorMap: () => ({ message: "Geçerli bir tür seçin." }),
  }),
  kisiFirma: z.string().trim().min(1, "Kişi / firma gereklidir."),
  projeMarka: z.string().trim().optional().or(z.literal("")),
  aciklama: z.string().trim().optional().or(z.literal("")),
  tutar: z.coerce
    .number({ invalid_type_error: "Tutar sayısal olmalıdır." })
    .positive("Tutar 0'dan büyük olmalıdır."),
  vadeTarihi: z.coerce
    .date({ invalid_type_error: "Geçerli bir vade tarihi girin." })
    .optional()
    .nullable(),
  durum: z.enum(debtStatuses, {
    errorMap: () => ({ message: "Geçerli bir durum seçin." }),
  }),
});

export const createDebtSchema = debtBodySchema;

export const updateDebtSchema = debtBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Güncellenecek alan bulunamadı." }
);

function serializeDebt(record: DebtRow): DebtDto {
  return {
    ...record,
    tutar: Number(record.tutar),
    vadeTarihi: record.vadeTarihi ? record.vadeTarihi.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toNullableString(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function listDebts(tenantId: string): Promise<DebtDto[]> {
  const records = await prisma.debtRecord.findMany({
    where: { tenantId },
    select: debtSelect,
    orderBy: [{ vadeTarihi: "asc" }, { createdAt: "desc" }],
  });
  return records.map(serializeDebt);
}

export async function getDebt(tenantId: string, id: string): Promise<DebtDto> {
  const record = await prisma.debtRecord.findFirst({
    where: { id, tenantId },
    select: debtSelect,
  });
  if (!record) throw new Error("Borç / alacak kaydı bulunamadı.");
  return serializeDebt(record);
}

export async function createDebt(
  tenantId: string,
  data: z.infer<typeof createDebtSchema>
): Promise<DebtDto> {
  const parsed = createDebtSchema.parse(data);

  const record = await prisma.debtRecord.create({
    data: {
      tenantId,
      tur: parsed.tur as DebtRecordType,
      kisiFirma: parsed.kisiFirma.trim(),
      projeMarka: toNullableString(parsed.projeMarka) ?? null,
      aciklama: toNullableString(parsed.aciklama) ?? null,
      tutar: parsed.tutar,
      vadeTarihi: parsed.vadeTarihi ?? null,
      durum: parsed.durum as DebtRecordStatus,
    },
    select: debtSelect,
  });

  return serializeDebt(record);
}

export async function updateDebt(
  tenantId: string,
  id: string,
  data: z.infer<typeof updateDebtSchema>
): Promise<DebtDto> {
  const parsed = updateDebtSchema.parse(data);

  const existing = await prisma.debtRecord.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Borç / alacak kaydı bulunamadı.");

  const updateData: Prisma.DebtRecordUpdateInput = {};

  if (parsed.tur !== undefined) updateData.tur = parsed.tur as DebtRecordType;
  if (parsed.kisiFirma !== undefined) updateData.kisiFirma = parsed.kisiFirma.trim();
  if (parsed.projeMarka !== undefined) updateData.projeMarka = toNullableString(parsed.projeMarka) ?? null;
  if (parsed.aciklama !== undefined) updateData.aciklama = toNullableString(parsed.aciklama) ?? null;
  if (parsed.tutar !== undefined) updateData.tutar = parsed.tutar;
  if (parsed.vadeTarihi !== undefined) updateData.vadeTarihi = parsed.vadeTarihi;
  if (parsed.durum !== undefined) updateData.durum = parsed.durum as DebtRecordStatus;

  const record = await prisma.debtRecord.update({
    where: { id },
    data: updateData,
    select: debtSelect,
  });

  return serializeDebt(record);
}

export async function deleteDebt(tenantId: string, id: string): Promise<void> {
  const result = await prisma.debtRecord.deleteMany({
    where: { id, tenantId },
  });
  if (result.count === 0) throw new Error("Borç / alacak kaydı bulunamadı.");
}
