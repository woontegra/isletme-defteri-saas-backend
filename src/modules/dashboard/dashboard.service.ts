import { z } from "zod";
import { prisma } from "../../prisma";
import {
  getReportSummary,
  type ReportMonthlyTrendDto,
  type ReportPendingItemDto,
  type ReportSummaryDto,
} from "../reports/report.service";
import { listPartnerCapitalTransactions } from "../capital/capital.service";
import { TRANSACTION_TYPE_LABELS } from "../exports/export-labels";

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

export type DashboardActivityType =
  | "GELIR"
  | "GIDER"
  | "BORC"
  | "ALACAK"
  | "ABONELIK"
  | "SERMAYE";

export type DashboardRecentItemDto = {
  id: string;
  tip: DashboardActivityType | "BORC_ALACAK";
  baslik: string;
  altBaslik: string | null;
  tutar: number;
  tarih: string;
};

export type DashboardActivityDto = {
  id: string;
  type: DashboardActivityType;
  title: string;
  subtitle: string | null;
  date: string;
  amount: number;
  statusLabel: string | null;
  targetPath: string;
};

export type DashboardUpcomingItemDto = {
  id: string;
  type: "BEKLEYEN_GIDER" | "BORC_VADESI" | "ALACAK_VADESI" | "ABONELIK_YENILEME" | "BEKLEYEN_TAHSILAT";
  title: string;
  subtitle: string | null;
  dueDate: string | null;
  amount: number;
  statusLabel: string | null;
  targetPath: string;
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
  recentActivities: DashboardActivityDto[];
  upcomingItems: DashboardUpcomingItemDto[];
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

function buildUpcomingItems(items: ReportPendingItemDto[]): DashboardUpcomingItemDto[] {
  return items.map((item) => {
    if (item.tip === "ODEME") {
      return {
        id: item.id,
        type: "BEKLEYEN_GIDER" as const,
        title: item.baslik,
        subtitle: item.altBaslik,
        dueDate: item.tarih,
        amount: item.tutar,
        statusLabel: item.durum,
        targetPath: "/app/giderler",
      };
    }
    if (item.tip === "BORC_ALACAK") {
      const isAlacak = item.durum === "Alacak";
      return {
        id: item.id,
        type: isAlacak ? ("ALACAK_VADESI" as const) : ("BORC_VADESI" as const),
        title: item.baslik,
        subtitle: item.altBaslik,
        dueDate: item.tarih,
        amount: item.tutar,
        statusLabel: item.durum,
        targetPath: "/app/borc-alacak",
      };
    }
    if (item.tip === "ABONELIK") {
      return {
        id: item.id,
        type: "ABONELIK_YENILEME" as const,
        title: item.baslik,
        subtitle: item.altBaslik,
        dueDate: item.tarih,
        amount: item.tutar,
        statusLabel: item.durum,
        targetPath: "/app/abonelikler",
      };
    }
    return {
      id: item.id,
      type: "BEKLEYEN_TAHSILAT" as const,
      title: item.baslik,
      subtitle: item.altBaslik,
      dueDate: item.tarih,
      amount: item.tutar,
      statusLabel: item.durum,
      targetPath: "/app/gelirler",
    };
  });
}

const ACTIVITY_PATHS: Record<DashboardActivityType, string> = {
  GELIR: "/app/gelirler",
  GIDER: "/app/giderler",
  BORC: "/app/borc-alacak",
  ALACAK: "/app/borc-alacak",
  ABONELIK: "/app/abonelikler",
  SERMAYE: "/app/sermaye",
};

function toActivityDto(
  item: DashboardRecentItemDto,
  statusLabel: string | null = null
): DashboardActivityDto {
  const type: DashboardActivityType =
    item.tip === "BORC_ALACAK" ? "BORC" : (item.tip as DashboardActivityType);
  return {
    id: item.id,
    type,
    title: item.baslik,
    subtitle: item.altBaslik,
    date: item.tarih,
    amount: item.tutar,
    statusLabel,
    targetPath: ACTIVITY_PATHS[type],
  };
}

function buildRecentActivities(groups: {
  gelirler: DashboardRecentItemDto[];
  giderler: DashboardRecentItemDto[];
  borcAlacak: DashboardRecentItemDto[];
  abonelikler: DashboardRecentItemDto[];
  sermaye: DashboardRecentItemDto[];
}): DashboardActivityDto[] {
  return [
    ...groups.gelirler.map((i) => toActivityDto(i)),
    ...groups.giderler.map((i) => toActivityDto(i)),
    ...groups.borcAlacak.map((i) => toActivityDto(i)),
    ...groups.abonelikler.map((i) => toActivityDto(i)),
    ...groups.sermaye.map((i) => toActivityDto(i)),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12);
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
        take: 6,
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
        take: 6,
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
        take: 6,
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
        take: 6,
      }),
      listPartnerCapitalTransactions(tenantId),
    ]);

  const recentCapital = capitalTransactions
    .filter((tx) => {
      if (!dateFilter) return true;
      const tarih = new Date(tx.tarih);
      return tarih >= dateFilter.gte && tarih <= dateFilter.lte;
    })
    .slice(0, 6);

  const sonHareketler = {
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
        tip: (r.tur === "ALACAK" ? "ALACAK" : "BORC") as DashboardActivityType,
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
        altBaslik: TRANSACTION_TYPE_LABELS[r.tur] ?? r.aciklama,
        tutar: safeNumber(r.tutar),
        tarih: r.tarih,
      })),
    };

  const yaklasanlar = buildYaklasanlar(summary);

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
    yaklasanlar,
    recentActivities: buildRecentActivities(sonHareketler),
    upcomingItems: buildUpcomingItems(yaklasanlar),
    sonHareketler,
  };
}
