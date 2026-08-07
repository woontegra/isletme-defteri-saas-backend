import type { DebtRecord, ExpenseRecord, IncomeRecord, SubscriptionRecord } from "@prisma/client";
import {
  BILLING_LABELS,
  DEBT_STATUS_LABELS,
  DEBT_TYPE_LABELS,
  EXPENSE_STATUS_LABELS,
  INCOME_SALE_TYPE_LABELS,
  INCOME_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from "./export-labels";
import {
  averageAmount,
  countWhere,
  groupBySum,
  maxAmount,
  sumAmount,
  sumWhere,
  truncateText,
} from "./export-analytics";
import { formatExportCurrency, formatExportDate, formatExportPercent } from "./format.utils";
import { formatExcelText } from "./excel.styles";
import { buildProfessionalModulePdfHtml } from "./pdf-html.builder";

function analysisToPdfRows(rows: ReturnType<typeof groupBySum>) {
  return rows.map((r) => [
    r.label,
    formatExportCurrency(r.total),
    String(r.count),
    formatExportPercent(r.ratio),
  ]);
}

export function buildExpensesProfessionalPdfHtml(options: {
  records: ExpenseRecord[];
  tenantName: string;
  periodLabel?: string;
}): string {
  const { records, tenantName, periodLabel } = options;
  const total = sumAmount(records, (r) => Number(r.tutar));
  const paid = sumWhere(records, (r) => r.odemeDurumu === "ODENDI", (r) => Number(r.tutar));
  const pending = sumWhere(records, (r) => r.odemeDurumu === "BEKLIYOR", (r) => Number(r.tutar));
  const avg = averageAmount(records, (r) => Number(r.tutar));
  const max = maxAmount(records, (r) => Number(r.tutar));

  return buildProfessionalModulePdfHtml({
    title: "Giderler Raporu",
    tenantName,
    periodLabel,
    recordCount: records.length,
    summaryCards: [
      { label: "Toplam Gider", value: formatExportCurrency(total), negative: true },
      { label: "Ödenen Gider", value: formatExportCurrency(paid), positive: true },
      { label: "Bekleyen Gider", value: formatExportCurrency(pending) },
      { label: "Kayıt Sayısı", value: String(records.length) },
      { label: "En Yüksek Gider", value: formatExportCurrency(max) },
      { label: "Ortalama Gider", value: formatExportCurrency(avg) },
    ],
    analysisSections: [
      {
        title: "Kategori Özeti",
        headers: ["Kategori", "Toplam", "Kayıt", "Oran"],
        rows: analysisToPdfRows(groupBySum(records, (r) => r.kategori, (r) => Number(r.tutar))),
        moneyColumns: [1],
      },
      {
        title: "Ödeme Durumu Özeti",
        headers: ["Durum", "Toplam", "Kayıt", "Oran"],
        rows: analysisToPdfRows(
          groupBySum(
            records,
            (r) => EXPENSE_STATUS_LABELS[r.odemeDurumu] ?? r.odemeDurumu,
            (r) => Number(r.tutar)
          )
        ),
        moneyColumns: [1],
      },
      {
        title: "Fiş / Fatura Özeti",
        headers: ["Durum", "Toplam", "Kayıt", "Oran"],
        rows: analysisToPdfRows(
          groupBySum(records, (r) => (r.fisFaturaVarMi ? "Var" : "Yok"), (r) => Number(r.tutar))
        ),
        moneyColumns: [1],
      },
    ],
    detailTitle: "Detay Gider Listesi",
    detailHeaders: ["Tarih", "Kategori", "Firma", "Açıklama", "Tutar", "Ödeme Durumu"],
    detailRows: records.map((r) => [
      formatExportDate(r.tarih),
      formatExcelText(r.kategori),
      formatExcelText(r.firmaTedarikci),
      truncateText(r.aciklama, 50),
      formatExportCurrency(Number(r.tutar)),
      EXPENSE_STATUS_LABELS[r.odemeDurumu] ?? r.odemeDurumu,
    ]),
    detailMoneyColumns: [4],
  });
}

export function buildIncomesProfessionalPdfHtml(options: {
  records: IncomeRecord[];
  tenantName: string;
  periodLabel?: string;
}): string {
  const { records, tenantName, periodLabel } = options;
  const total = sumAmount(records, (r) => Number(r.tutar));
  const collected = sumWhere(records, (r) => r.tahsilDurumu === "TAHSIL_EDILDI", (r) => Number(r.tutar));
  const pending = sumWhere(records, (r) => r.tahsilDurumu === "BEKLIYOR", (r) => Number(r.tutar));
  const avg = averageAmount(records, (r) => Number(r.tutar));
  const max = maxAmount(records, (r) => Number(r.tutar));

  return buildProfessionalModulePdfHtml({
    title: "Gelirler Raporu",
    tenantName,
    periodLabel,
    recordCount: records.length,
    summaryCards: [
      { label: "Toplam Gelir", value: formatExportCurrency(total), positive: true },
      { label: "Tahsil Edilen", value: formatExportCurrency(collected), positive: true },
      { label: "Bekleyen Tahsilat", value: formatExportCurrency(pending) },
      { label: "Kayıt Sayısı", value: String(records.length) },
      { label: "En Yüksek Gelir", value: formatExportCurrency(max) },
      { label: "Ortalama Gelir", value: formatExportCurrency(avg) },
    ],
    analysisSections: [
      {
        title: "Satış Türü Özeti",
        headers: ["Satış Türü", "Toplam", "Kayıt", "Oran"],
        rows: analysisToPdfRows(
          groupBySum(
            records,
            (r) => (r.satisTuru ? INCOME_SALE_TYPE_LABELS[r.satisTuru] ?? r.satisTuru : "Belirtilmemiş"),
            (r) => Number(r.tutar)
          )
        ),
        moneyColumns: [1],
      },
      {
        title: "Tahsil Durumu Özeti",
        headers: ["Durum", "Toplam", "Kayıt", "Oran"],
        rows: analysisToPdfRows(
          groupBySum(
            records,
            (r) => INCOME_STATUS_LABELS[r.tahsilDurumu] ?? r.tahsilDurumu,
            (r) => Number(r.tutar)
          )
        ),
        moneyColumns: [1],
      },
      {
        title: "Fatura Özeti",
        headers: ["Durum", "Toplam", "Kayıt", "Oran"],
        rows: analysisToPdfRows(
          groupBySum(records, (r) => (r.faturaKesildiMi ? "Kesildi" : "Kesilmedi"), (r) => Number(r.tutar))
        ),
        moneyColumns: [1],
      },
    ],
    detailTitle: "Detay Gelir Listesi",
    detailHeaders: ["Tarih", "Ürün/Hizmet", "Müşteri", "Satış Türü", "Tutar", "Tahsil"],
    detailRows: records.map((r) => [
      formatExportDate(r.tarih),
      formatExcelText(r.urunHizmet ?? r.projeMarka),
      formatExcelText(r.musteri),
      r.satisTuru ? INCOME_SALE_TYPE_LABELS[r.satisTuru] ?? r.satisTuru : "—",
      formatExportCurrency(Number(r.tutar)),
      INCOME_STATUS_LABELS[r.tahsilDurumu] ?? r.tahsilDurumu,
    ]),
    detailMoneyColumns: [4],
  });
}

export function buildDebtsProfessionalPdfHtml(options: {
  records: DebtRecord[];
  tenantName: string;
}): string {
  const { records, tenantName } = options;
  const openDebt = sumWhere(records, (r) => r.tur === "BORC" && r.durum === "ACIK", (r) => Number(r.tutar));
  const openCredit = sumWhere(records, (r) => r.tur === "ALACAK" && r.durum === "ACIK", (r) => Number(r.tutar));

  return buildProfessionalModulePdfHtml({
    title: "Borç / Alacak Raporu",
    tenantName,
    recordCount: records.length,
    summaryCards: [
      { label: "Açık Borç", value: formatExportCurrency(openDebt), negative: true },
      { label: "Açık Alacak", value: formatExportCurrency(openCredit), positive: true },
      { label: "Net Durum", value: formatExportCurrency(openCredit - openDebt), positive: openCredit >= openDebt, negative: openCredit < openDebt },
      { label: "Kayıt Sayısı", value: String(records.length) },
    ],
    analysisSections: [
      {
        title: "Tür Özeti",
        headers: ["Tür", "Toplam", "Kayıt", "Oran"],
        rows: analysisToPdfRows(groupBySum(records, (r) => DEBT_TYPE_LABELS[r.tur] ?? r.tur, (r) => Number(r.tutar))),
        moneyColumns: [1],
      },
      {
        title: "Durum Özeti",
        headers: ["Durum", "Toplam", "Kayıt", "Oran"],
        rows: analysisToPdfRows(
          groupBySum(records, (r) => DEBT_STATUS_LABELS[r.durum] ?? r.durum, (r) => Number(r.tutar))
        ),
        moneyColumns: [1],
      },
    ],
    detailTitle: "Detay Borç / Alacak Listesi",
    detailHeaders: ["Vade", "Kişi/Firma", "Tür", "Tutar", "Durum"],
    detailRows: records.map((r) => [
      formatExportDate(r.vadeTarihi),
      formatExcelText(r.kisiFirma),
      DEBT_TYPE_LABELS[r.tur] ?? r.tur,
      formatExportCurrency(Number(r.tutar)),
      DEBT_STATUS_LABELS[r.durum] ?? r.durum,
    ]),
    detailMoneyColumns: [3],
  });
}

export function buildSubscriptionsProfessionalPdfHtml(options: {
  records: SubscriptionRecord[];
  tenantName: string;
}): string {
  const { records, tenantName } = options;
  const active = countWhere(records, (r) => r.durum === "AKTIF");
  const monthly = sumWhere(records, (r) => r.faturaDonemi === "AYLIK" && r.durum === "AKTIF", (r) => Number(r.tutar));
  const yearly = sumWhere(records, (r) => r.faturaDonemi === "YILLIK" && r.durum === "AKTIF", (r) => Number(r.tutar));

  return buildProfessionalModulePdfHtml({
    title: "Abonelikler Raporu",
    tenantName,
    recordCount: records.length,
    summaryCards: [
      { label: "Aktif Abonelik", value: String(active) },
      { label: "Aylık Toplam", value: formatExportCurrency(monthly) },
      { label: "Yıllık Toplam", value: formatExportCurrency(yearly) },
      { label: "Kayıt Sayısı", value: String(records.length) },
    ],
    analysisSections: [
      {
        title: "Fatura Dönemi Özeti",
        headers: ["Dönem", "Toplam", "Kayıt", "Oran"],
        rows: analysisToPdfRows(
          groupBySum(records, (r) => BILLING_LABELS[r.faturaDonemi] ?? r.faturaDonemi, (r) => Number(r.tutar))
        ),
        moneyColumns: [1],
      },
      {
        title: "Durum Özeti",
        headers: ["Durum", "Toplam", "Kayıt", "Oran"],
        rows: analysisToPdfRows(
          groupBySum(records, (r) => SUBSCRIPTION_STATUS_LABELS[r.durum] ?? r.durum, (r) => Number(r.tutar))
        ),
        moneyColumns: [1],
      },
    ],
    detailTitle: "Detay Abonelik Listesi",
    detailHeaders: ["Hizmet", "Kategori", "Dönem", "Tutar", "Yenileme", "Durum"],
    detailRows: records.map((r) => [
      formatExcelText(r.hizmetAdi),
      formatExcelText(r.kategori),
      BILLING_LABELS[r.faturaDonemi] ?? r.faturaDonemi,
      formatExportCurrency(Number(r.tutar)),
      formatExportDate(r.sonrakiYenilemeTarihi),
      SUBSCRIPTION_STATUS_LABELS[r.durum] ?? r.durum,
    ]),
    detailMoneyColumns: [3],
  });
}
