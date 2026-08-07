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
import { countWhere, sumAmount, sumWhere } from "./export-analytics";
import { formatExportDate } from "./format.utils";
import {
  buildCompanyInfoSection,
  buildDataTable,
  buildLetterhead,
  buildSectionTitle,
  buildSummaryTable,
  buildTotalsBox,
  moneyCell,
  wrapOfficialPdf,
} from "./official-pdf.builder";
import type { ExportCompanyInfo } from "./tenant-meta";
import {
  EXPENSE_DETAIL_COLUMNS,
  INCOME_DETAIL_COLUMNS,
  safeCellText,
  type PdfTableColumn,
} from "./pdf-table.builder";

function buildOfficialModulePdf(options: {
  documentTitle: string;
  reportTitle: string;
  company: ExportCompanyInfo;
  periodLabel?: string;
  summaryRows: Array<[string, string]>;
  detailTitle: string;
  detailColumns?: PdfTableColumn[];
  detailHeaders?: string[];
  detailRows: string[][];
  detailMoneyCols?: number[];
  totals: Array<[string, string]>;
}): string {
  const detail = options.detailColumns
    ? buildDataTable(options.detailTitle, [], options.detailRows, { columns: options.detailColumns })
    : buildDataTable(options.detailTitle, options.detailHeaders ?? [], options.detailRows, {
        moneyCols: options.detailMoneyCols,
      });

  const body = `
    ${buildLetterhead(options.company, options.reportTitle, options.periodLabel)}
    ${buildCompanyInfoSection(options.company)}
    ${buildSummaryTable(options.summaryRows)}
    ${detail}
    ${buildSectionTitle("SONUÇ")}
    ${buildTotalsBox(options.totals)}
  `;

  return wrapOfficialPdf(options.documentTitle, body);
}

export function buildExpensesProfessionalPdfHtml(options: {
  records: ExpenseRecord[];
  company: ExportCompanyInfo;
  periodLabel?: string;
}): string {
  const { records, company, periodLabel } = options;
  const total = sumAmount(records, (r) => Number(r.tutar));
  const paid = sumWhere(records, (r) => r.odemeDurumu === "ODENDI", (r) => Number(r.tutar));
  const pending = sumWhere(records, (r) => r.odemeDurumu === "BEKLIYOR", (r) => Number(r.tutar));
  const fisVar = countWhere(records, (r) => r.fisFaturaVarMi);
  const fisYok = records.length - fisVar;

  return buildOfficialModulePdf({
    documentTitle: "Giderler Raporu",
    reportTitle: "GİDERLER RAPORU",
    company,
    periodLabel,
    summaryRows: [
      ["Toplam Gider", moneyCell(total)],
      ["Ödenen Gider", moneyCell(paid)],
      ["Bekleyen Gider", moneyCell(pending)],
      ["Fiş/Fatura Var", String(fisVar)],
      ["Fiş/Fatura Yok", String(fisYok)],
      ["Kayıt Sayısı", String(records.length)],
    ],
    detailTitle: "GİDER DETAYLARI",
    detailColumns: EXPENSE_DETAIL_COLUMNS,
    detailRows: records.map((r) => [
      safeCellText(formatExportDate(r.tarih)),
      safeCellText(r.kategori),
      safeCellText(r.firmaTedarikci),
      safeCellText(r.aciklama),
      moneyCell(Number(r.tutar)),
      safeCellText(EXPENSE_STATUS_LABELS[r.odemeDurumu] ?? r.odemeDurumu),
      safeCellText(r.fisFaturaVarMi ? "Var" : "Yok"),
    ]),
    totals: [
      ["Toplam Gider", moneyCell(total)],
      ["Bekleyen Gider", moneyCell(pending)],
      ["Ödenen Gider", moneyCell(paid)],
    ],
  });
}

export function buildIncomesProfessionalPdfHtml(options: {
  records: IncomeRecord[];
  company: ExportCompanyInfo;
  periodLabel?: string;
}): string {
  const { records, company, periodLabel } = options;
  const total = sumAmount(records, (r) => Number(r.tutar));
  const collected = sumWhere(records, (r) => r.tahsilDurumu === "TAHSIL_EDILDI", (r) => Number(r.tutar));
  const pending = sumWhere(records, (r) => r.tahsilDurumu === "BEKLIYOR", (r) => Number(r.tutar));
  const invoiced = countWhere(records, (r) => r.faturaKesildiMi);
  const notInvoiced = records.length - invoiced;

  return buildOfficialModulePdf({
    documentTitle: "Gelirler Raporu",
    reportTitle: "GELİRLER RAPORU",
    company,
    periodLabel,
    summaryRows: [
      ["Toplam Gelir", moneyCell(total)],
      ["Tahsil Edilen", moneyCell(collected)],
      ["Bekleyen Tahsilat", moneyCell(pending)],
      ["Fatura Kesilen", String(invoiced)],
      ["Fatura Kesilmeyen", String(notInvoiced)],
      ["Kayıt Sayısı", String(records.length)],
    ],
    detailTitle: "GELİR DETAYLARI",
    detailColumns: INCOME_DETAIL_COLUMNS,
    detailRows: records.map((r) => [
      safeCellText(formatExportDate(r.tarih)),
      safeCellText(r.urunHizmet ?? r.projeMarka),
      safeCellText(r.musteri),
      safeCellText(r.satisTuru ? INCOME_SALE_TYPE_LABELS[r.satisTuru] ?? r.satisTuru : null),
      safeCellText(r.donemPaket),
      moneyCell(Number(r.tutar)),
      safeCellText(INCOME_STATUS_LABELS[r.tahsilDurumu] ?? r.tahsilDurumu),
      safeCellText(r.faturaKesildiMi ? "Kesildi" : "Kesilmedi"),
    ]),
    totals: [
      ["Toplam Gelir", moneyCell(total)],
      ["Bekleyen Tahsilat", moneyCell(pending)],
      ["Tahsil Edilen", moneyCell(collected)],
    ],
  });
}

export function buildDebtsProfessionalPdfHtml(options: {
  records: DebtRecord[];
  company: ExportCompanyInfo;
}): string {
  const { records, company } = options;
  const openDebt = sumWhere(records, (r) => r.tur === "BORC" && r.durum === "ACIK", (r) => Number(r.tutar));
  const openCredit = sumWhere(records, (r) => r.tur === "ALACAK" && r.durum === "ACIK", (r) => Number(r.tutar));
  const closed = countWhere(records, (r) => r.durum === "KAPANDI");
  const cancelled = countWhere(records, (r) => r.durum === "IPTAL");
  const upcoming = countWhere(records, (r) => {
    if (r.durum !== "ACIK" || !r.vadeTarihi) return false;
    const vade = new Date(r.vadeTarihi);
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    return vade <= limit;
  });

  return buildOfficialModulePdf({
    documentTitle: "Borç / Alacak Raporu",
    reportTitle: "BORÇ / ALACAK RAPORU",
    company,
    summaryRows: [
      ["Açık Borç", moneyCell(openDebt)],
      ["Açık Alacak", moneyCell(openCredit)],
      ["Net Durum", moneyCell(openCredit - openDebt)],
      ["Yaklaşan Vade", String(upcoming)],
      ["Kapalı Kayıt", String(closed)],
      ["İptal Kayıt", String(cancelled)],
    ],
    detailTitle: "BORÇ / ALACAK DETAYLARI",
    detailHeaders: ["Tür", "Kişi / Firma", "Açıklama", "Vade", "Tutar", "Durum"],
    detailRows: records.map((r) => [
      safeCellText(DEBT_TYPE_LABELS[r.tur] ?? r.tur),
      safeCellText(r.kisiFirma),
      safeCellText(r.aciklama),
      safeCellText(formatExportDate(r.vadeTarihi)),
      moneyCell(Number(r.tutar)),
      safeCellText(DEBT_STATUS_LABELS[r.durum] ?? r.durum),
    ]),
    detailMoneyCols: [4],
    totals: [["Net Borç / Alacak Durumu", moneyCell(openCredit - openDebt)]],
  });
}

export function buildSubscriptionsProfessionalPdfHtml(options: {
  records: SubscriptionRecord[];
  company: ExportCompanyInfo;
}): string {
  const { records, company } = options;
  const active = countWhere(records, (r) => r.durum === "AKTIF");
  const monthly = sumWhere(records, (r) => r.faturaDonemi === "AYLIK" && r.durum === "AKTIF", (r) => Number(r.tutar));
  const yearly = sumWhere(records, (r) => r.faturaDonemi === "YILLIK" && r.durum === "AKTIF", (r) => Number(r.tutar));
  const paused = countWhere(records, (r) => r.durum === "DURAKLATILDI");
  const cancelled = countWhere(records, (r) => r.durum === "IPTAL");
  const upcoming = countWhere(records, (r) => {
    if (r.durum !== "AKTIF" || !r.sonrakiYenilemeTarihi) return false;
    const renew = new Date(r.sonrakiYenilemeTarihi);
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    return renew <= limit;
  });

  return buildOfficialModulePdf({
    documentTitle: "Abonelikler Raporu",
    reportTitle: "ABONELİKLER RAPORU",
    company,
    summaryRows: [
      ["Aktif Abonelik", String(active)],
      ["Aylık Toplam", moneyCell(monthly)],
      ["Yıllık Toplam", moneyCell(yearly)],
      ["Yaklaşan Yenileme", String(upcoming)],
      ["Duraklatılan", String(paused)],
      ["İptal", String(cancelled)],
    ],
    detailTitle: "ABONELİK DETAYLARI",
    detailHeaders: ["Hizmet", "Kategori", "Fatura Dönemi", "Tutar", "Sonraki Yenileme", "Durum", "Not"],
    detailRows: records.map((r) => [
      safeCellText(r.hizmetAdi),
      safeCellText(r.kategori),
      safeCellText(BILLING_LABELS[r.faturaDonemi] ?? r.faturaDonemi),
      moneyCell(Number(r.tutar)),
      safeCellText(formatExportDate(r.sonrakiYenilemeTarihi)),
      safeCellText(SUBSCRIPTION_STATUS_LABELS[r.durum] ?? r.durum),
      safeCellText(r.not),
    ]),
    detailMoneyCols: [3],
    totals: [
      ["Aylık Toplam", moneyCell(monthly)],
      ["Yıllık Toplam", moneyCell(yearly)],
    ],
  });
}
