import { Prisma, SubscriptionBillingCycle, SubscriptionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma";

export const subscriptionSelect = {
  id: true,
  tenantId: true,
  hizmetAdi: true,
  kategori: true,
  projeMarka: true,
  faturaDonemi: true,
  tutar: true,
  sonrakiYenilemeTarihi: true,
  durum: true,
  not: true,
  createdAt: true,
  updatedAt: true,
} as const;

type SubscriptionRow = Prisma.SubscriptionRecordGetPayload<{ select: typeof subscriptionSelect }>;

export type SubscriptionDto = Omit<
  SubscriptionRow,
  "tutar" | "sonrakiYenilemeTarihi" | "createdAt" | "updatedAt"
> & {
  tutar: number;
  sonrakiYenilemeTarihi: string | null;
  createdAt: string;
  updatedAt: string;
};

const billingCycles = ["AYLIK", "YILLIK", "OZEL"] as const;
const subscriptionStatuses = ["AKTIF", "DURAKLATILDI", "IPTAL"] as const;

const subscriptionBodySchema = z.object({
  hizmetAdi: z.string().trim().min(1, "Hizmet adı gereklidir."),
  kategori: z.string().trim().min(1, "Kategori gereklidir."),
  projeMarka: z.string().trim().optional().or(z.literal("")),
  faturaDonemi: z.enum(billingCycles, {
    errorMap: () => ({ message: "Geçerli bir fatura dönemi seçin." }),
  }),
  tutar: z.coerce
    .number({ invalid_type_error: "Tutar sayısal olmalıdır." })
    .positive("Tutar 0'dan büyük olmalıdır."),
  sonrakiYenilemeTarihi: z.coerce
    .date({ invalid_type_error: "Geçerli bir yenileme tarihi girin." })
    .optional()
    .nullable(),
  durum: z.enum(subscriptionStatuses, {
    errorMap: () => ({ message: "Geçerli bir durum seçin." }),
  }),
  not: z.string().trim().optional().or(z.literal("")),
});

export const createSubscriptionSchema = subscriptionBodySchema;

export const updateSubscriptionSchema = subscriptionBodySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Güncellenecek alan bulunamadı." }
);

function serializeSubscription(record: SubscriptionRow): SubscriptionDto {
  return {
    ...record,
    tutar: Number(record.tutar),
    sonrakiYenilemeTarihi: record.sonrakiYenilemeTarihi
      ? record.sonrakiYenilemeTarihi.toISOString()
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toNullableString(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function listSubscriptions(tenantId: string): Promise<SubscriptionDto[]> {
  const records = await prisma.subscriptionRecord.findMany({
    where: { tenantId },
    select: subscriptionSelect,
    orderBy: [{ sonrakiYenilemeTarihi: "asc" }, { createdAt: "desc" }],
  });
  return records.map(serializeSubscription);
}

export async function getSubscription(tenantId: string, id: string): Promise<SubscriptionDto> {
  const record = await prisma.subscriptionRecord.findFirst({
    where: { id, tenantId },
    select: subscriptionSelect,
  });
  if (!record) throw new Error("Abonelik kaydı bulunamadı.");
  return serializeSubscription(record);
}

export async function createSubscription(
  tenantId: string,
  data: z.infer<typeof createSubscriptionSchema>
): Promise<SubscriptionDto> {
  const parsed = createSubscriptionSchema.parse(data);

  const record = await prisma.subscriptionRecord.create({
    data: {
      tenantId,
      hizmetAdi: parsed.hizmetAdi.trim(),
      kategori: parsed.kategori.trim(),
      projeMarka: toNullableString(parsed.projeMarka) ?? null,
      faturaDonemi: parsed.faturaDonemi as SubscriptionBillingCycle,
      tutar: parsed.tutar,
      sonrakiYenilemeTarihi: parsed.sonrakiYenilemeTarihi ?? null,
      durum: parsed.durum as SubscriptionStatus,
      not: toNullableString(parsed.not) ?? null,
    },
    select: subscriptionSelect,
  });

  return serializeSubscription(record);
}

export async function updateSubscription(
  tenantId: string,
  id: string,
  data: z.infer<typeof updateSubscriptionSchema>
): Promise<SubscriptionDto> {
  const parsed = updateSubscriptionSchema.parse(data);

  const existing = await prisma.subscriptionRecord.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!existing) throw new Error("Abonelik kaydı bulunamadı.");

  const updateData: Prisma.SubscriptionRecordUpdateInput = {};

  if (parsed.hizmetAdi !== undefined) updateData.hizmetAdi = parsed.hizmetAdi.trim();
  if (parsed.kategori !== undefined) updateData.kategori = parsed.kategori.trim();
  if (parsed.projeMarka !== undefined) updateData.projeMarka = toNullableString(parsed.projeMarka) ?? null;
  if (parsed.faturaDonemi !== undefined) {
    updateData.faturaDonemi = parsed.faturaDonemi as SubscriptionBillingCycle;
  }
  if (parsed.tutar !== undefined) updateData.tutar = parsed.tutar;
  if (parsed.sonrakiYenilemeTarihi !== undefined) {
    updateData.sonrakiYenilemeTarihi = parsed.sonrakiYenilemeTarihi;
  }
  if (parsed.durum !== undefined) updateData.durum = parsed.durum as SubscriptionStatus;
  if (parsed.not !== undefined) updateData.not = toNullableString(parsed.not) ?? null;

  const record = await prisma.subscriptionRecord.update({
    where: { id },
    data: updateData,
    select: subscriptionSelect,
  });

  return serializeSubscription(record);
}

export async function deleteSubscription(tenantId: string, id: string): Promise<void> {
  const result = await prisma.subscriptionRecord.deleteMany({
    where: { id, tenantId },
  });
  if (result.count === 0) throw new Error("Abonelik kaydı bulunamadı.");
}
