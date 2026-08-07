import { ExpensePaymentStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { buildIncomeExpenseWhere, type ModulePeriodQuery } from "../../lib/module-period";
import { prisma } from "../../prisma";

export const expenseSelect = {
  id: true,
  tenantId: true,
  tarih: true,
  vadeTarihi: true,
  kategori: true,
  projeMarka: true,
  firmaTedarikci: true,
  aciklama: true,
  tutar: true,
  kdvOrani: true,
  kdvDahilMi: true,
  odemeDurumu: true,
  fisFaturaVarMi: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ExpenseRow = Prisma.ExpenseRecordGetPayload<{ select: typeof expenseSelect }>;

export type ExpenseDto = Omit<
  ExpenseRow,
  "tutar" | "kdvOrani" | "tarih" | "vadeTarihi" | "createdAt" | "updatedAt"
> & {
  tutar: number;
  kdvOrani: number | null;
  tarih: string;
  vadeTarihi: string | null;
  createdAt: string;
  updatedAt: string;
};

const paymentStatuses = ["ODENDI", "BEKLIYOR"] as const;

const expenseBodySchema = z.object({
  tarih: z.coerce.date({ invalid_type_error: "Geçerli bir tarih girin." }),
  vadeTarihi: z.coerce.date({ invalid_type_error: "Geçerli bir vade tarihi girin." }).optional().nullable(),
  kategori: z.string().trim().min(1, "Kategori gereklidir."),
  projeMarka: z.string().trim().optional().or(z.literal("")),
  firmaTedarikci: z.string().trim().optional().or(z.literal("")),
  aciklama: z.string().trim().optional().or(z.literal("")),
  tutar: z.coerce
    .number({ invalid_type_error: "Tutar sayısal olmalıdır." })
    .positive("Tutar 0'dan büyük olmalıdır."),
  kdvOrani: z.coerce
    .number({ invalid_type_error: "KDV oranı sayısal olmalıdır." })
    .min(0, "KDV oranı 0 veya daha büyük olmalıdır.")
    .optional()
    .nullable(),
  kdvDahilMi: z.boolean().default(false),
  odemeDurumu: z.enum(paymentStatuses, {
    errorMap: () => ({ message: "Geçerli bir ödeme durumu seçin." }),
  }),
  fisFaturaVarMi: z.boolean().default(false),
});

export const createExpenseSchema = expenseBodySchema;

export const updateExpenseSchema = expenseBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Güncellenecek alan bulunamadı." }
);

function serializeExpense(record: ExpenseRow): ExpenseDto {
  return {
    ...record,
    tutar: Number(record.tutar),
    kdvOrani: record.kdvOrani !== null ? Number(record.kdvOrani) : null,
    tarih: record.tarih.toISOString(),
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

export async function listExpenses(
  tenantId: string,
  periodQuery: ModulePeriodQuery
): Promise<ExpenseDto[]> {
  const records = await prisma.expenseRecord.findMany({
    where: buildIncomeExpenseWhere(tenantId, periodQuery),
    select: expenseSelect,
    orderBy: [{ tarih: "desc" }, { createdAt: "desc" }],
  });
  return records.map(serializeExpense);
}

export async function getExpense(tenantId: string, id: string): Promise<ExpenseDto> {
  const record = await prisma.expenseRecord.findFirst({
    where: { id, tenantId },
    select: expenseSelect,
  });
  if (!record) throw new Error("Gider kaydı bulunamadı.");
  return serializeExpense(record);
}

export async function createExpense(
  tenantId: string,
  data: z.infer<typeof createExpenseSchema>
): Promise<ExpenseDto> {
  const parsed = createExpenseSchema.parse(data);

  const record = await prisma.expenseRecord.create({
    data: {
      tenantId,
      tarih: parsed.tarih,
      vadeTarihi: parsed.vadeTarihi ?? null,
      kategori: parsed.kategori.trim(),
      projeMarka: toNullableString(parsed.projeMarka) ?? null,
      firmaTedarikci: toNullableString(parsed.firmaTedarikci) ?? null,
      aciklama: toNullableString(parsed.aciklama) ?? null,
      tutar: parsed.tutar,
      kdvOrani: parsed.kdvOrani ?? null,
      kdvDahilMi: parsed.kdvDahilMi,
      odemeDurumu: parsed.odemeDurumu as ExpensePaymentStatus,
      fisFaturaVarMi: parsed.fisFaturaVarMi,
    },
    select: expenseSelect,
  });

  return serializeExpense(record);
}

export async function updateExpense(
  tenantId: string,
  id: string,
  data: z.infer<typeof updateExpenseSchema>
): Promise<ExpenseDto> {
  const parsed = updateExpenseSchema.parse(data);

  const existing = await prisma.expenseRecord.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Gider kaydı bulunamadı.");

  const updateData: Prisma.ExpenseRecordUpdateInput = {};

  if (parsed.tarih !== undefined) updateData.tarih = parsed.tarih;
  if (parsed.vadeTarihi !== undefined) updateData.vadeTarihi = parsed.vadeTarihi;
  if (parsed.kategori !== undefined) updateData.kategori = parsed.kategori.trim();
  if (parsed.projeMarka !== undefined) updateData.projeMarka = toNullableString(parsed.projeMarka) ?? null;
  if (parsed.firmaTedarikci !== undefined) updateData.firmaTedarikci = toNullableString(parsed.firmaTedarikci) ?? null;
  if (parsed.aciklama !== undefined) updateData.aciklama = toNullableString(parsed.aciklama) ?? null;
  if (parsed.tutar !== undefined) updateData.tutar = parsed.tutar;
  if (parsed.kdvOrani !== undefined) updateData.kdvOrani = parsed.kdvOrani;
  if (parsed.kdvDahilMi !== undefined) updateData.kdvDahilMi = parsed.kdvDahilMi;
  if (parsed.odemeDurumu !== undefined) {
    updateData.odemeDurumu = parsed.odemeDurumu as ExpensePaymentStatus;
  }
  if (parsed.fisFaturaVarMi !== undefined) updateData.fisFaturaVarMi = parsed.fisFaturaVarMi;

  const record = await prisma.expenseRecord.update({
    where: { id },
    data: updateData,
    select: expenseSelect,
  });

  return serializeExpense(record);
}

export async function deleteExpense(tenantId: string, id: string): Promise<void> {
  const result = await prisma.expenseRecord.deleteMany({
    where: { id, tenantId },
  });
  if (result.count === 0) throw new Error("Gider kaydı bulunamadı.");
}
