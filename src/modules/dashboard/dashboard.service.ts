import { z } from "zod";
import { prisma } from "../../prisma";
import {
  getReportSummary,
  type ReportMonthlyTrendDto,
  type ReportPendingItemDto,
  type ReportSummaryDto,
} from "../reports/report.service";
import { listPartnerCapitalTransactions } from "../capital/capital.service";

export type DashboardPeriod =
  | "THIS_MONTH"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "THIS_YEAR"
  | "ALL_TIME";

const dashboardPeriods = [
  "THIS_MONTH",
  "LAST_3_MONTHS",
  "LAST_6_MONTHS",
  "THIS_YEAR",
  "ALL_TIME",
] as const;

export const dashboardQuerySchema = z.object({
  period: z.enum(dashboardPeriods, {
    errorMap: () => ({ message: "Geçerli bir dönem seçin." }),
  }),
});

export type DashboardRecentItemDto = {
  id: string;
  tip: "GELIR" | "GIDER" | "BORC_ALACAK" | "ABONELIK" | "SERMAYE";
  baslik: string;
  altBaslik: string | null;
  tutar: number;
  tarih: string;
};

export type DashboardSummaryDto = {
  period: {
    type: DashboardPeriod;
    startDate: string;
    endDate: string;
  };
  genel: ReportSummaryDto["genel"];
  borcAlacak: ReportSummaryDto["borcAlacak"];
  abonelik: ReportSummaryDto["abonelik"];
  sermaye: ReportSummaryDto["sermaye"];
  aylikTrend: ReportMonthlyTrendDto[];
  yaklasanlar: ReportPendingItemDto[];
  sonHareketler: {
    gelirler: DashboardRecentItemDto[];
    giderler: DashboardRecentItemDto[];
    borcAlacak: DashboardRecentItemDto[];
    abonelikler: DashboardRecentItemDto[];
    sermaye: DashboardRecentItemDto[];
  };
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getEarliestTransactionDate(tenantId: string): Promise<Date> {
  const [incomeMin, expenseMin] = await Promise.all([
    prisma.incomeRecord.findFirst({
      where: { tenantId },
      orderBy: { tarih: "asc" },
      select: { tarih: true },
    }),
    prisma.expenseRecord.findFirst({
      where: { tenantId },
      orderBy: { tarih: "asc" },
      select: { tarih: true },
    }),
  ]);

  const dates = [incomeMin?.tarih, expenseMin?.tarih].filter(Boolean) as Date[];
  if (dates.length === 0) return startOfDay(new Date());
  return startOfDay(new Date(Math.min(...dates.map((d) => d.getTime()))));
}

async function resolveReportQuery(
  tenantId: string,
  period: DashboardPeriod
): Promise<z.infer<typeof import("../reports/report.service").reportQuerySchema>> {
  if (period === "ALL_TIME") {
    const startDate = await getEarliestTransactionDate(tenantId);
    return {
      period: "CUSTOM",
      startDate,
      endDate: new Date(),
    };
  }
  return { period };
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function buildYaklasanlar(summary: ReportSummaryDto): ReportPendingItemDto[] {
  const items = [
    ...summary.bekleyenler.yaklasanBorcAlacak,
    ...summary.bekleyenler.yaklasanAbonelikYenilemeleri,
    ...summary.bekleyenler.bekleyenOdemeler,
  ];

  return items
    .sort((a, b) => {
      const aTime = a.tarih ? new Date(a.tarih).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.tarih ? new Date(b.tarih).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .slice(0, 8);
}

export async function getDashboardSummary(
  tenantId: string,
  query: z.infer<typeof dashboardQuerySchema>
): Promise<DashboardSummaryDto> {
  const parsed = dashboardQuerySchema.parse(query);
  const reportQuery = await resolveReportQuery(tenantId, parsed.period);
  const summary = await getReportSummary(tenantId, reportQuery);

  const dateFilter =
    parsed.period === "ALL_TIME"
      ? undefined
      : {
          gte: new Date(summary.period.startDate),
          lte: new Date(summary.period.endDate),
        };

  const [recentIncomes, recentExpenses, recentDebts, recentSubscriptions, capitalTransactions] =
    await Promise.all([
      prisma.incomeRecord.findMany({
        where: dateFilter ? { tenantId, tarih: dateFilter } : { tenantId },
        select: {
          id: true,
          tarih: true,
          musteri: true,
          projeMarka: true,
          aciklama: true,
          tutar: true,
        },
        orderBy: [{ tarih: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      prisma.expenseRecord.findMany({
        where: dateFilter ? { tenantId, tarih: dateFilter } : { tenantId },
        select: {
          id: true,
          tarih: true,
          kategori: true,
          firmaTedarikci: true,
          aciklama: true,
          tutar: true,
        },
        orderBy: [{ tarih: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      prisma.debtRecord.findMany({
        where: { tenantId },
        select: {
          id: true,
          tur: true,
          kisiFirma: true,
          projeMarka: true,
          tutar: true,
          vadeTarihi: true,
          createdAt: true,
        },
        orderBy: [{ vadeTarihi: "asc" }, { createdAt: "desc" }],
        take: 5,
      }),
      prisma.subscriptionRecord.findMany({
        where: { tenantId, durum: "AKTIF" },
        select: {
          id: true,
          hizmetAdi: true,
          kategori: true,
          tutar: true,
          sonrakiYenilemeTarihi: true,
        },
        orderBy: { sonrakiYenilemeTarihi: "asc" },
        take: 5,
      }),
      listPartnerCapitalTransactions(tenantId),
    ]);

  const recentCapital = capitalTransactions
    .filter((tx) => {
      if (!dateFilter) return true;
      const tarih = new Date(tx.tarih);
      return tarih >= dateFilter.gte && tarih <= dateFilter.lte;
    })
    .slice(0, 5);

  return {
    period: {
      type: parsed.period,
      startDate: summary.period.startDate,
      endDate: summary.period.endDate,
    },
    genel: summary.genel,
    borcAlacak: summary.borcAlacak,
    abonelik: summary.abonelik,
    sermaye: summary.sermaye,
    aylikTrend: summary.aylikTrend,
    yaklasanlar: buildYaklasanlar(summary),
    sonHareketler: {
      gelirler: recentIncomes.map((r) => ({
        id: r.id,
        tip: "GELIR" as const,
        baslik: r.musteri?.trim() || r.aciklama?.trim() || "Gelir kaydı",
        altBaslik: r.projeMarka,
        tutar: safeNumber(Number(r.tutar)),
        tarih: r.tarih.toISOString(),
      })),
      giderler: recentExpenses.map((r) => ({
        id: r.id,
        tip: "GIDER" as const,
        baslik: r.firmaTedarikci?.trim() || r.kategori || "Gider kaydı",
        altBaslik: r.aciklama,
        tutar: safeNumber(Number(r.tutar)),
        tarih: r.tarih.toISOString(),
      })),
      borcAlacak: recentDebts.map((r) => ({
        id: r.id,
        tip: "BORC_ALACAK" as const,
        baslik: r.kisiFirma,
        altBaslik: r.projeMarka,
        tutar: safeNumber(Number(r.tutar)),
        tarih: (r.vadeTarihi ?? r.createdAt).toISOString(),
      })),
      abonelikler: recentSubscriptions.map((r) => ({
        id: r.id,
        tip: "ABONELIK" as const,
        baslik: r.hizmetAdi,
        altBaslik: r.kategori,
        tutar: safeNumber(Number(r.tutar)),
        tarih: (r.sonrakiYenilemeTarihi ?? new Date()).toISOString(),
      })),
      sermaye: recentCapital.map((r) => ({
        id: r.id,
        tip: "SERMAYE" as const,
        baslik: r.ortakAdi,
        altBaslik: r.aciklama,
        tutar: safeNumber(r.tutar),
        tarih: r.tarih,
      })),
    },
  };
}
