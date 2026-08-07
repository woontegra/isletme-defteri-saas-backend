import { z } from "zod";
import { prisma } from "../../prisma";
import { getCapitalSummary, type CapitalSummaryDto } from "../capital/capital.service";

export type ReportPeriod =
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "THIS_YEAR"
  | "CUSTOM";

const reportPeriods = [
  "THIS_MONTH",
  "LAST_MONTH",
  "LAST_3_MONTHS",
  "LAST_6_MONTHS",
  "THIS_YEAR",
  "CUSTOM",
] as const;

export const reportQuerySchema = z
  .object({
    period: z.enum(reportPeriods, {
      errorMap: () => ({ message: "Geçerli bir dönem seçin." }),
    }),
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

export type ReportPendingItemDto = {
  id: string;
  tip: "TAHSILAT" | "ODEME" | "BORC_ALACAK" | "ABONELIK";
  baslik: string;
  altBaslik: string | null;
  tutar: number;
  tarih: string | null;
  durum: string | null;
};

export type ReportCategorySummaryDto = {
  kategori: string;
  toplam: number;
  adet: number;
};

export type ReportProjectSummaryDto = {
  projeMarka: string;
  gelir: number;
  gider: number;
  net: number;
};

export type ReportMonthlyTrendDto = {
  ay: string;
  gelir: number;
  gider: number;
  net: number;
};

export type ReportSummaryDto = {
  period: {
    type: ReportPeriod;
    startDate: string;
    endDate: string;
  };
  genel: {
    toplamGelir: number;
    toplamGider: number;
    netDurum: number;
    tahsilEdilenGelir: number;
    bekleyenTahsilat: number;
    odenenGider: number;
    bekleyenGider: number;
  };
  borcAlacak: {
    acikBorc: number;
    acikAlacak: number;
    netBorcAlacak: number;
    yaklasanVadeSayisi: number;
  };
  abonelik: {
    aktifAbonelikSayisi: number;
    aylikAbonelikToplami: number;
    yillikAbonelikToplami: number;
    yaklasanYenilemeSayisi: number;
  };
  giderKategorileri: ReportCategorySummaryDto[];
  projeMarkaOzeti: ReportProjectSummaryDto[];
  aylikTrend: ReportMonthlyTrendDto[];
  bekleyenler: {
    bekleyenTahsilatlar: ReportPendingItemDto[];
    bekleyenOdemeler: ReportPendingItemDto[];
    yaklasanBorcAlacak: ReportPendingItemDto[];
    yaklasanAbonelikYenilemeleri: ReportPendingItemDto[];
  };
  sermaye: CapitalSummaryDto;
};

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

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

function resolveDateRange(
  period: ReportPeriod,
  startDate?: Date,
  endDate?: Date
): { start: Date; end: Date } {
  const today = startOfDay(new Date());

  switch (period) {
    case "THIS_MONTH": {
      const start = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
      return { start, end: endOfDay(today) };
    }
    case "LAST_MONTH": {
      const start = startOfDay(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      const end = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
      return { start, end };
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

function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function buildMonthlyTrend(
  start: Date,
  end: Date,
  incomes: { tarih: Date; tutar: unknown }[],
  expenses: { tarih: Date; tutar: unknown }[]
): ReportMonthlyTrendDto[] {
  const months: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= endMonth) {
    months.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const incomeByMonth = new Map<string, number>();
  const expenseByMonth = new Map<string, number>();

  for (const income of incomes) {
    const key = monthKey(income.tarih);
    incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + safeNumber(Number(income.tutar)));
  }

  for (const expense of expenses) {
    const key = monthKey(expense.tarih);
    expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + safeNumber(Number(expense.tutar)));
  }

  return months.map((ay) => {
    const gelir = safeNumber(incomeByMonth.get(ay) ?? 0);
    const gider = safeNumber(expenseByMonth.get(ay) ?? 0);
    return { ay, gelir, gider, net: gelir - gider };
  });
}

function isWithin30Days(date: Date): boolean {
  const today = startOfDay(new Date());
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 30);
  const target = startOfDay(date);
  return target <= limit;
}

export async function getReportSummary(
  tenantId: string,
  query: z.infer<typeof reportQuerySchema>
): Promise<ReportSummaryDto> {
  const parsed = reportQuerySchema.parse(query);
  const { start, end } = resolveDateRange(parsed.period, parsed.startDate, parsed.endDate);

  const dateFilter = { gte: start, lte: end };

  const [incomes, expenses, debts, subscriptions, sermaye] = await Promise.all([
    prisma.incomeRecord.findMany({
      where: { tenantId, tarih: dateFilter },
      select: {
        id: true,
        tarih: true,
        projeMarka: true,
        musteri: true,
        aciklama: true,
        tutar: true,
        tahsilDurumu: true,
      },
      orderBy: { tarih: "desc" },
    }),
    prisma.expenseRecord.findMany({
      where: { tenantId, tarih: dateFilter },
      select: {
        id: true,
        tarih: true,
        vadeTarihi: true,
        kategori: true,
        projeMarka: true,
        firmaTedarikci: true,
        aciklama: true,
        tutar: true,
        odemeDurumu: true,
      },
      orderBy: { tarih: "desc" },
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
        durum: true,
      },
      orderBy: { vadeTarihi: "asc" },
    }),
    prisma.subscriptionRecord.findMany({
      where: { tenantId },
      select: {
        id: true,
        hizmetAdi: true,
        kategori: true,
        tutar: true,
        faturaDonemi: true,
        sonrakiYenilemeTarihi: true,
        durum: true,
      },
      orderBy: { sonrakiYenilemeTarihi: "asc" },
    }),
    getCapitalSummary(tenantId),
  ]);

  const toplamGelir = incomes.reduce((sum, r) => sum + safeNumber(Number(r.tutar)), 0);
  const tahsilEdilenGelir = incomes
    .filter((r) => r.tahsilDurumu === "TAHSIL_EDILDI")
    .reduce((sum, r) => sum + safeNumber(Number(r.tutar)), 0);
  const bekleyenTahsilat = incomes
    .filter((r) => r.tahsilDurumu === "BEKLIYOR")
    .reduce((sum, r) => sum + safeNumber(Number(r.tutar)), 0);

  const toplamGider = expenses.reduce((sum, r) => sum + safeNumber(Number(r.tutar)), 0);
  const odenenGider = expenses
    .filter((r) => r.odemeDurumu === "ODENDI")
    .reduce((sum, r) => sum + safeNumber(Number(r.tutar)), 0);
  const bekleyenGider = expenses
    .filter((r) => r.odemeDurumu === "BEKLIYOR")
    .reduce((sum, r) => sum + safeNumber(Number(r.tutar)), 0);

  const openDebts = debts.filter((r) => r.durum === "ACIK");
  const acikBorc = openDebts
    .filter((r) => r.tur === "BORC")
    .reduce((sum, r) => sum + safeNumber(Number(r.tutar)), 0);
  const acikAlacak = openDebts
    .filter((r) => r.tur === "ALACAK")
    .reduce((sum, r) => sum + safeNumber(Number(r.tutar)), 0);

  const yaklasanVadeSayisi = openDebts.filter(
    (r) => r.vadeTarihi && isWithin30Days(r.vadeTarihi)
  ).length;

  const activeSubscriptions = subscriptions.filter((r) => r.durum === "AKTIF");
  const aylikAbonelikToplami = activeSubscriptions
    .filter((r) => r.faturaDonemi === "AYLIK")
    .reduce((sum, r) => sum + safeNumber(Number(r.tutar)), 0);
  const yillikAbonelikToplami = activeSubscriptions
    .filter((r) => r.faturaDonemi === "YILLIK")
    .reduce((sum, r) => sum + safeNumber(Number(r.tutar)), 0);
  const yaklasanYenilemeSayisi = activeSubscriptions.filter(
    (r) => r.sonrakiYenilemeTarihi && isWithin30Days(r.sonrakiYenilemeTarihi)
  ).length;

  const categoryMap = new Map<string, { toplam: number; adet: number }>();
  for (const expense of expenses) {
    const key = expense.kategori.trim() || "Diğer";
    const current = categoryMap.get(key) ?? { toplam: 0, adet: 0 };
    current.toplam += safeNumber(Number(expense.tutar));
    current.adet += 1;
    categoryMap.set(key, current);
  }

  const giderKategorileri = Array.from(categoryMap.entries())
    .map(([kategori, data]) => ({
      kategori,
      toplam: safeNumber(data.toplam),
      adet: data.adet,
    }))
    .sort((a, b) => b.toplam - a.toplam);

  const projectMap = new Map<string, { gelir: number; gider: number }>();
  const projectKey = (value: string | null) => (value?.trim() ? value.trim() : "Genel");

  for (const income of incomes) {
    const key = projectKey(income.projeMarka);
    const current = projectMap.get(key) ?? { gelir: 0, gider: 0 };
    current.gelir += safeNumber(Number(income.tutar));
    projectMap.set(key, current);
  }

  for (const expense of expenses) {
    const key = projectKey(expense.projeMarka);
    const current = projectMap.get(key) ?? { gelir: 0, gider: 0 };
    current.gider += safeNumber(Number(expense.tutar));
    projectMap.set(key, current);
  }

  const projeMarkaOzeti = Array.from(projectMap.entries())
    .map(([projeMarka, data]) => ({
      projeMarka,
      gelir: safeNumber(data.gelir),
      gider: safeNumber(data.gider),
      net: safeNumber(data.gelir - data.gider),
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  const aylikTrend = buildMonthlyTrend(start, end, incomes, expenses);

  const bekleyenTahsilatlar: ReportPendingItemDto[] = incomes
    .filter((r) => r.tahsilDurumu === "BEKLIYOR")
    .map((r) => ({
      id: r.id,
      tip: "TAHSILAT" as const,
      baslik: r.musteri?.trim() || r.aciklama?.trim() || "Gelir kaydı",
      altBaslik: r.projeMarka,
      tutar: safeNumber(Number(r.tutar)),
      tarih: r.tarih.toISOString(),
      durum: "Bekliyor",
    }));

  const bekleyenOdemeler: ReportPendingItemDto[] = expenses
    .filter((r) => r.odemeDurumu === "BEKLIYOR")
    .map((r) => ({
      id: r.id,
      tip: "ODEME" as const,
      baslik: r.firmaTedarikci?.trim() || r.kategori || "Gider kaydı",
      altBaslik: r.aciklama,
      tutar: safeNumber(Number(r.tutar)),
      tarih: (r.vadeTarihi ?? r.tarih).toISOString(),
      durum: "Bekliyor",
    }));

  const yaklasanBorcAlacak: ReportPendingItemDto[] = openDebts
    .filter((r) => r.vadeTarihi && isWithin30Days(r.vadeTarihi))
    .map((r) => ({
      id: r.id,
      tip: "BORC_ALACAK" as const,
      baslik: r.kisiFirma,
      altBaslik: r.projeMarka,
      tutar: safeNumber(Number(r.tutar)),
      tarih: r.vadeTarihi?.toISOString() ?? null,
      durum: r.tur === "BORC" ? "Borç" : "Alacak",
    }));

  const yaklasanAbonelikYenilemeleri: ReportPendingItemDto[] = activeSubscriptions
    .filter((r) => r.sonrakiYenilemeTarihi && isWithin30Days(r.sonrakiYenilemeTarihi))
    .map((r) => ({
      id: r.id,
      tip: "ABONELIK" as const,
      baslik: r.hizmetAdi,
      altBaslik: r.kategori,
      tutar: safeNumber(Number(r.tutar)),
      tarih: r.sonrakiYenilemeTarihi?.toISOString() ?? null,
      durum: "Aktif",
    }));

  return {
    period: {
      type: parsed.period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
    genel: {
      toplamGelir: safeNumber(toplamGelir),
      toplamGider: safeNumber(toplamGider),
      netDurum: safeNumber(toplamGelir - toplamGider),
      tahsilEdilenGelir: safeNumber(tahsilEdilenGelir),
      bekleyenTahsilat: safeNumber(bekleyenTahsilat),
      odenenGider: safeNumber(odenenGider),
      bekleyenGider: safeNumber(bekleyenGider),
    },
    borcAlacak: {
      acikBorc: safeNumber(acikBorc),
      acikAlacak: safeNumber(acikAlacak),
      netBorcAlacak: safeNumber(acikAlacak - acikBorc),
      yaklasanVadeSayisi,
    },
    abonelik: {
      aktifAbonelikSayisi: activeSubscriptions.length,
      aylikAbonelikToplami: safeNumber(aylikAbonelikToplami),
      yillikAbonelikToplami: safeNumber(yillikAbonelikToplami),
      yaklasanYenilemeSayisi,
    },
    giderKategorileri,
    projeMarkaOzeti,
    aylikTrend,
    bekleyenler: {
      bekleyenTahsilatlar,
      bekleyenOdemeler,
      yaklasanBorcAlacak,
      yaklasanAbonelikYenilemeleri,
    },
    sermaye,
  };
}
