import ExcelJS from "exceljs";
import { getReportSummary, reportQuerySchema } from "../reports/report.service";
import type { ReportSummaryDto } from "../reports/report.service";
import { PERIOD_LABELS, WARNING_LABELS } from "./export-labels";
import {
  exportFileDate,
  formatExportDate,
  formatExportPercent,
  formatMonthLabel,
  netProjectStatus,
  ratioOf,
  safeMoney,
} from "./format.utils";
import {
  addEmptyMessageRow,
  addReportHeaderBlock,
  applyMoneyFormat,
  applyNetValueStyle,
  applyPercentFormat,
  finalizeDataTable,
  formatExcelText,
  setColumnWidths,
  styleDarkHeaderRow,
  TURKISH_MONEY_FORMAT,
  workbookToBuffer,
  type ReportHeaderMeta,
} from "./excel.styles";
import { getTenantExportMeta } from "./tenant-meta";

function periodLabel(summary: ReportSummaryDto): string {
  return `${formatExportDate(summary.period.startDate)} - ${formatExportDate(summary.period.endDate)} (${PERIOD_LABELS[summary.period.type] ?? summary.period.type})`;
}

function addSectionTitle(sheet: ExcelJS.Worksheet, row: number, title: string, colSpan: number): number {
  sheet.mergeCells(row, 1, row, colSpan);
  const cell = sheet.getCell(row, 1);
  cell.value = title;
  cell.font = { bold: true, size: 12, color: { argb: "FF0F172A" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  return row + 1;
}

function addMetricTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  rows: Array<{ label: string; value: string | number; desc?: string; money?: boolean; net?: boolean }>
): number {
  const headerRow = startRow;
  sheet.addRow(["Gösterge", "Değer", "Açıklama"]);
  styleDarkHeaderRow(sheet, headerRow, 3);
  let current = headerRow + 1;
  for (const row of rows) {
    const added = sheet.addRow([row.label, row.value, row.desc ?? ""]);
    if (row.money && typeof row.value === "number") {
      added.getCell(2).numFmt = TURKISH_MONEY_FORMAT;
    }
    if (row.net && typeof row.value === "number") {
      applyNetValueStyle(added.getCell(2), row.value);
    }
    current += 1;
  }
  setColumnWidths(sheet, [32, 22, 36]);
  return current + 1;
}

export async function buildProfessionalReportsExcel(
  tenantId: string,
  query: { period?: string; startDate?: string; endDate?: string }
): Promise<{ buffer: Buffer; filename: string }> {
  const parsed = reportQuerySchema.parse({
    period: query.period ?? "THIS_MONTH",
    startDate: query.startDate,
    endDate: query.endDate,
  });
  const [summary, { tenantName }] = await Promise.all([
    getReportSummary(tenantId, parsed),
    getTenantExportMeta(tenantId),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Woontegra";
  workbook.created = new Date();

  const headerMeta: ReportHeaderMeta = {
    reportTitle: "Finansal Rapor",
    tenantName,
    periodLabel: periodLabel(summary),
  };

  // 1. Finansal Özet
  const ozet = workbook.addWorksheet("Finansal Özet");
  let row = addReportHeaderBlock(ozet, headerMeta);
  row = addSectionTitle(ozet, row, "Ana Özet", 3);
  row = addMetricTable(ozet, row, [
    { label: "Toplam Gelir", value: safeMoney(summary.genel.toplamGelir), money: true, desc: "Dönem gelir toplamı" },
    { label: "Toplam Gider", value: safeMoney(summary.genel.toplamGider), money: true, desc: "Dönem gider toplamı" },
    { label: "Net Durum", value: safeMoney(summary.genel.netDurum), money: true, net: true, desc: "Gelir - Gider" },
    { label: "Tahsil Edilen Gelir", value: safeMoney(summary.genel.tahsilEdilenGelir), money: true },
    { label: "Bekleyen Tahsilat", value: safeMoney(summary.genel.bekleyenTahsilat), money: true },
    { label: "Ödenen Gider", value: safeMoney(summary.genel.odenenGider), money: true },
    { label: "Bekleyen Gider", value: safeMoney(summary.genel.bekleyenGider), money: true },
    { label: "Açık Borç", value: safeMoney(summary.borcAlacak.acikBorc), money: true },
    { label: "Açık Alacak", value: safeMoney(summary.borcAlacak.acikAlacak), money: true },
    { label: "Net Borç / Alacak", value: safeMoney(summary.borcAlacak.netBorcAlacak), money: true, net: true },
    { label: "Aktif Abonelik", value: summary.abonelik.aktifAbonelikSayisi, desc: "Adet" },
    { label: "Yaklaşan Vade", value: summary.borcAlacak.yaklasanVadeSayisi, desc: "30 gün içinde" },
    { label: "Yaklaşan Yenileme", value: summary.abonelik.yaklasanYenilemeSayisi, desc: "30 gün içinde" },
  ]);

  // 2. Gelir Gider sheet
  const gg = workbook.addWorksheet("Gelir Gider");
  row = addReportHeaderBlock(gg, { ...headerMeta, reportTitle: "Gelir / Gider Özeti" });
  const compareTotal = Math.max(summary.genel.toplamGelir, summary.genel.toplamGider, 1);
  const ggHeader = row;
  gg.addRow(["Kalem", "Tutar", "Oran", "Durum"]);
  styleDarkHeaderRow(gg, ggHeader, 4);
  const ggRows = [
    ["Toplam Gelir", safeMoney(summary.genel.toplamGelir), ratioOf(summary.genel.toplamGelir, compareTotal), "Gelir"],
    ["Toplam Gider", safeMoney(summary.genel.toplamGider), ratioOf(summary.genel.toplamGider, compareTotal), "Gider"],
    ["Net Durum", safeMoney(summary.genel.netDurum), ratioOf(Math.abs(summary.genel.netDurum), compareTotal), summary.genel.netDurum >= 0 ? "Pozitif" : "Negatif"],
  ];
  for (const [label, amount, rate, status] of ggRows) {
    const added = gg.addRow([label, amount, rate, status]);
    added.getCell(2).numFmt = TURKISH_MONEY_FORMAT;
    added.getCell(3).numFmt = "0.0%";
    if (label === "Net Durum") applyNetValueStyle(added.getCell(2), safeMoney(amount));
  }
  setColumnWidths(gg, [24, 18, 12, 16]);

  // 3. Aylık Trend
  const trend = workbook.addWorksheet("Aylık Trend");
  row = addReportHeaderBlock(trend, { ...headerMeta, reportTitle: "Aylık Trend" });
  const trendHeader = row;
  trend.addRow(["Ay", "Gelir", "Gider", "Net"]);
  styleDarkHeaderRow(trend, trendHeader, 4);
  if (summary.aylikTrend.length === 0) {
    addEmptyMessageRow(trend, trendHeader + 1, "Bu dönem için kayıt bulunamadı.", 4);
  } else {
    for (const month of summary.aylikTrend) {
      const added = trend.addRow([
        formatMonthLabel(month.ay),
        safeMoney(month.gelir),
        safeMoney(month.gider),
        safeMoney(month.net),
      ]);
      applyNetValueStyle(added.getCell(4), safeMoney(month.net));
    }
    applyMoneyFormat(trend, 2, trendHeader + 1);
    applyMoneyFormat(trend, 3, trendHeader + 1);
    applyMoneyFormat(trend, 4, trendHeader + 1);
  }
  setColumnWidths(trend, [20, 16, 16, 16]);
  finalizeDataTable(trend, trendHeader, 4);

  // 4. Gider Kategorileri
  const cats = workbook.addWorksheet("Gider Kategorileri");
  row = addReportHeaderBlock(cats, { ...headerMeta, reportTitle: "Gider Kategorileri" });
  const catHeader = row;
  cats.addRow(["Kategori", "Toplam Gider", "Kayıt Sayısı", "Oran"]);
  styleDarkHeaderRow(cats, catHeader, 4);
  const catTotal = summary.giderKategorileri.reduce((s, c) => s + c.toplam, 0);
  if (summary.giderKategorileri.length === 0) {
    addEmptyMessageRow(cats, catHeader + 1, "Bu dönem için kayıt bulunamadı.", 4);
  } else {
    for (const cat of summary.giderKategorileri) {
      const rate = ratioOf(cat.toplam, catTotal);
      const added = cats.addRow([cat.kategori, safeMoney(cat.toplam), cat.adet, rate]);
      added.getCell(4).numFmt = "0.0%";
    }
    applyMoneyFormat(cats, 2, catHeader + 1);
  }
  setColumnWidths(cats, [24, 18, 14, 12]);
  finalizeDataTable(cats, catHeader, 4);

  // 5. Proje Marka
  const proje = workbook.addWorksheet("Proje Marka");
  row = addReportHeaderBlock(proje, { ...headerMeta, reportTitle: "Proje / Marka Özeti" });
  const projeHeader = row;
  proje.addRow(["Proje / Marka", "Gelir", "Gider", "Net", "Durum"]);
  styleDarkHeaderRow(proje, projeHeader, 5);
  if (summary.projeMarkaOzeti.length === 0) {
    addEmptyMessageRow(proje, projeHeader + 1, "Bu dönem için kayıt bulunamadı.", 5);
  } else {
    for (const item of summary.projeMarkaOzeti) {
      const added = proje.addRow([
        item.projeMarka,
        safeMoney(item.gelir),
        safeMoney(item.gider),
        safeMoney(item.net),
        netProjectStatus(item.net),
      ]);
      applyNetValueStyle(added.getCell(4), safeMoney(item.net));
    }
    applyMoneyFormat(proje, 2, projeHeader + 1);
    applyMoneyFormat(proje, 3, projeHeader + 1);
    applyMoneyFormat(proje, 4, projeHeader + 1);
  }
  setColumnWidths(proje, [24, 16, 16, 16, 14]);
  finalizeDataTable(proje, projeHeader, 5);

  // 6. Bekleyenler
  const bekleyen = workbook.addWorksheet("Bekleyenler");
  row = addReportHeaderBlock(bekleyen, { ...headerMeta, reportTitle: "Bekleyen İşlemler" });
  const sections = [
    { title: "Bekleyen Tahsilatlar", items: summary.bekleyenler.bekleyenTahsilatlar },
    { title: "Bekleyen Giderler", items: summary.bekleyenler.bekleyenOdemeler },
    { title: "Yaklaşan Borç / Alacak Vadeleri", items: summary.bekleyenler.yaklasanBorcAlacak },
    { title: "Yaklaşan Abonelik Yenilemeleri", items: summary.bekleyenler.yaklasanAbonelikYenilemeleri },
  ];
  for (const section of sections) {
    row = addSectionTitle(bekleyen, row, section.title, 5);
    const secHeader = row;
    bekleyen.addRow(["Başlık", "Alt Bilgi", "Tutar", "Tarih", "Durum"]);
    styleDarkHeaderRow(bekleyen, secHeader, 5);
    row = secHeader + 1;
    if (section.items.length === 0) {
      addEmptyMessageRow(bekleyen, row, "Bu dönem için kayıt bulunamadı.", 5);
      row += 2;
    } else {
      for (const item of section.items) {
        bekleyen.addRow([
          item.baslik,
          formatExcelText(item.altBaslik),
          safeMoney(item.tutar),
          formatExportDate(item.tarih),
          formatExcelText(item.durum),
        ]);
        row += 1;
      }
      applyMoneyFormat(bekleyen, 3, secHeader + 1);
      row += 1;
    }
  }
  setColumnWidths(bekleyen, [26, 24, 16, 14, 14]);

  // 7-9 summary sheets
  const borc = workbook.addWorksheet("Borc Alacak");
  row = addReportHeaderBlock(borc, { ...headerMeta, reportTitle: "Borç / Alacak Özeti" });
  addMetricTable(borc, row, [
    { label: "Açık Borç", value: safeMoney(summary.borcAlacak.acikBorc), money: true },
    { label: "Açık Alacak", value: safeMoney(summary.borcAlacak.acikAlacak), money: true },
    { label: "Net Borç / Alacak", value: safeMoney(summary.borcAlacak.netBorcAlacak), money: true, net: true },
    { label: "Yaklaşan Vade Sayısı", value: summary.borcAlacak.yaklasanVadeSayisi, desc: "30 gün içinde" },
  ]);

  const abn = workbook.addWorksheet("Abonelikler");
  row = addReportHeaderBlock(abn, { ...headerMeta, reportTitle: "Abonelik Özeti" });
  addMetricTable(abn, row, [
    { label: "Aktif Abonelik Sayısı", value: summary.abonelik.aktifAbonelikSayisi },
    { label: "Aylık Abonelik Toplamı", value: safeMoney(summary.abonelik.aylikAbonelikToplami), money: true },
    { label: "Yıllık Abonelik Toplamı", value: safeMoney(summary.abonelik.yillikAbonelikToplami), money: true },
    { label: "Yaklaşan Yenileme Sayısı", value: summary.abonelik.yaklasanYenilemeSayisi },
  ]);

  const sermaye = workbook.addWorksheet("Sermaye");
  row = addReportHeaderBlock(sermaye, { ...headerMeta, reportTitle: "Sermaye Özeti" });
  addMetricTable(sermaye, row, [
    { label: "Ana Sermaye", value: safeMoney(summary.sermaye.anaSermaye), money: true },
    { label: "Ödenen Ana Sermaye", value: safeMoney(summary.sermaye.toplamAnaSermayeOdemesi), money: true },
    { label: "Kalan Ana Sermaye", value: safeMoney(summary.sermaye.kalanAnaSermayeOdemesi), money: true },
    { label: "Ana Sermaye Ödeme Oranı", value: formatExportPercent(summary.sermaye.anaSermayeOdemeOrani) },
    { label: "Ortak Para Limiti", value: safeMoney(summary.sermaye.ortakParaLimiti), money: true },
    { label: "Net Ortak Alacağı", value: safeMoney(summary.sermaye.netOrtakAlacagi), money: true },
    { label: "Kalan Ortak Para Limiti", value: safeMoney(summary.sermaye.kalanLimit), money: true },
    { label: "Ortak Para Kullanım Oranı", value: formatExportPercent(summary.sermaye.kullanimOrani), desc: "Ortak para limiti kullanımı" },
    {
      label: "Uyarı Durumu",
      value: WARNING_LABELS[summary.sermaye.uyariDurumu] ?? summary.sermaye.uyariDurumu,
      desc: "Mali müşavirinizle değerlendirmeniz önerilir",
    },
  ]);

  return {
    buffer: await workbookToBuffer(workbook),
    filename: `raporlar-${exportFileDate()}.xlsx`,
  };
}
