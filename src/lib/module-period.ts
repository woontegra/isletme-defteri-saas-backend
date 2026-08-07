import { z } from "zod";

export type ModulePeriod =
  | "THIS_MONTH"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "THIS_YEAR"
  | "ALL_TIME"
  | "CUSTOM";

export const modulePeriods = [
  "THIS_MONTH",
  "LAST_3_MONTHS",
  "LAST_6_MONTHS",
  "THIS_YEAR",
  "ALL_TIME",
  "CUSTOM",
] as const;

export const MODULE_PERIOD_LABELS: Record<ModulePeriod, string> = {
  THIS_MONTH: "Bu Ay",
  LAST_3_MONTHS: "Son 3 Ay",
  LAST_6_MONTHS: "Son 6 Ay",
  THIS_YEAR: "Bu Yıl",
  ALL_TIME: "Tüm Zamanlar",
  CUSTOM: "Özel Tarih",
};

export const modulePeriodQuerySchema = z
  .object({
    period: z.enum(modulePeriods).optional().default("THIS_MONTH"),
    startDate: z.coerce.date({ invalid_type_error: "Geçerli bir başlangıç tarihi girin." }).optional(),
    endDate: z.coerce.date({ invalid_type_error: "Geçerli bir bitiş tarihi girin." }).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.period === "CUSTOM") {
      if (!data.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Özel dönem için başlangıç tarihi gereklidir.",
          path: ["startDate"],
        });
      }
      if (!data.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Özel dönem için bitiş tarihi gereklidir.",
          path: ["endDate"],
        });
      }
      if (data.startDate && data.endDate && data.startDate > data.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Başlangıç tarihi bitiş tarihinden sonra olamaz.",
          path: ["startDate"],
        });
      }
    }
  });

export type ModulePeriodQuery = z.infer<typeof modulePeriodQuerySchema>;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function resolveModuleDateRange(
  period: ModulePeriod,
  startDate?: Date,
  endDate?: Date
): { start: Date; end: Date } | null {
  const today = startOfDay(new Date());

  switch (period) {
    case "THIS_MONTH": {
      const start = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
      return { start, end: endOfDay(today) };
    }
    case "LAST_3_MONTHS": {
      const start = startOfDay(new Date(today.getFullYear(), today.getMonth() - 2, 1));
      return { start, end: endOfDay(today) };
    }
    case "LAST_6_MONTHS": {
      const start = startOfDay(new Date(today.getFullYear(), today.getMonth() - 5, 1));
      return { start, end: endOfDay(today) };
    }
    case "THIS_YEAR": {
      const start = startOfDay(new Date(today.getFullYear(), 0, 1));
      return { start, end: endOfDay(today) };
    }
    case "ALL_TIME":
      return null;
    case "CUSTOM": {
      if (!startDate || !endDate) {
        throw new Error("Özel dönem için başlangıç ve bitiş tarihi gereklidir.");
      }
      return { start: startOfDay(startDate), end: endOfDay(endDate) };
    }
    default:
      return { start: startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)), end: endOfDay(today) };
  }
}

export function buildTarihWhereClause(range: { start: Date; end: Date } | null) {
  if (!range) return undefined;
  return { gte: range.start, lte: range.end };
}

export function formatModulePeriodLabel(
  period: ModulePeriod,
  startDate?: Date,
  endDate?: Date
): string {
  if (period === "CUSTOM" && startDate && endDate) {
    const fmt = (d: Date) =>
      d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `${fmt(startDate)} - ${fmt(endDate)}`;
  }
  return MODULE_PERIOD_LABELS[period];
}

export function getModulePeriodLabelFromQuery(query: ModulePeriodQuery): string {
  return formatModulePeriodLabel(query.period, query.startDate, query.endDate);
}

export function parseModulePeriodQuery(query: Record<string, unknown>): ModulePeriodQuery {
  return modulePeriodQuerySchema.parse({
    period: query.period,
    startDate: query.startDate,
    endDate: query.endDate,
  });
}

export function buildIncomeExpenseWhere(
  tenantId: string,
  query: ModulePeriodQuery
): { tenantId: string; tarih?: { gte: Date; lte: Date } } {
  const range = resolveModuleDateRange(query.period, query.startDate, query.endDate);
  const tarih = buildTarihWhereClause(range);
  return tarih ? { tenantId, tarih } : { tenantId };
}
