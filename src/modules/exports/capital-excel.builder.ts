import ExcelJS from "exceljs";
import {
  getCapitalSettings,
  getCapitalSummary,
  listCapitalIncreases,
  listCapitalPartners,
  listPartnerCapitalTransactions,
} from "../capital/capital.service";
import { TRANSACTION_TYPE_LABELS, WARNING_LABELS } from "./export-labels";
import { exportFileDate, formatExportPercent, safeMoney } from "./format.utils";
import {
  addReportHeaderBlock,
  applyMoneyFormat,
  applyNetValueStyle,
  finalizeDataTable,
  formatExcelDate,
  formatExcelText,
  setColumnWidths,
  styleDarkHeaderRow,
  workbookToBuffer,
} from "./excel.styles";
import { getTenantExportMeta } from "./tenant-meta";

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
      added.getCell(2).numFmt = '#.##0,00" ₺"';
    }
    if (row.net && typeof row.value === "number") {
      applyNetValueStyle(added.getCell(2), row.value);
    }
    current += 1;
  }
  setColumnWidths(sheet, [32, 22, 36]);
  finalizeDataTable(sheet, headerRow, 3);
  return current + 1;
}

export async function buildCapitalExcel(
  tenantId: string
): Promise<{ buffer: Buffer; filename: string }> {
  const [settings, summary, increases, partners, transactions, { tenantName }] = await Promise.all([
    getCapitalSettings(tenantId),
    getCapitalSummary(tenantId),
    listCapitalIncreases(tenantId),
    listCapitalPartners(tenantId),
    listPartnerCapitalTransactions(tenantId),
    getTenantExportMeta(tenantId),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Woontegra";

  const ayarlar = workbook.addWorksheet("Sirket Ayarlari");
  let row = addReportHeaderBlock(ayarlar, {
    reportTitle: "Sermaye / Şirket Bilgileri",
    tenantName,
  });
  row = addMetricTable(ayarlar, row, [
    { label: "Şirket Ünvanı", value: formatExcelText(settings.sirketUnvani) },
    { label: "Kuruluş Tarihi", value: formatExcelDate(settings.kurulusTarihi) },
    { label: "Ticaret Sicil Gazete Tarihi", value: formatExcelDate(settings.ticaretSicilGazeteTarihi) },
    { label: "Ana Sermaye", value: safeMoney(settings.anaSermaye), money: true },
    { label: "Ortak Para Çarpanı", value: safeMoney(settings.ortakParaCarpani) },
    { label: "Uyarı Oranı", value: formatExportPercent(settings.uyariOrani) },
    { label: "Son Sermaye Artırım Tarihi", value: formatExcelDate(settings.sonSermayeArtirimTarihi) },
    { label: "Notlar", value: formatExcelText(settings.notlar) },
  ]);

  const ozet = workbook.addWorksheet("Ozet");
  row = addReportHeaderBlock(ozet, { reportTitle: "Sermaye Özeti", tenantName });
  addMetricTable(ozet, row, [
    { label: "Ana Sermaye", value: safeMoney(summary.anaSermaye), money: true },
    { label: "Ödenen Ana Sermaye", value: safeMoney(summary.toplamAnaSermayeOdemesi), money: true },
    { label: "Kalan Ana Sermaye", value: safeMoney(summary.kalanAnaSermayeOdemesi), money: true },
    { label: "Ana Sermaye Ödeme Oranı", value: formatExportPercent(summary.anaSermayeOdemeOrani) },
    { label: "Ortak Para Limiti", value: safeMoney(summary.ortakParaLimiti), money: true },
    { label: "Net Ortak Alacağı", value: safeMoney(summary.netOrtakAlacagi), money: true },
    { label: "Kalan Ortak Para Limiti", value: safeMoney(summary.kalanLimit), money: true },
    { label: "Ortak Para Kullanım Oranı", value: formatExportPercent(summary.kullanimOrani) },
    {
      label: "Uyarı Durumu",
      value: WARNING_LABELS[summary.uyariDurumu] ?? summary.uyariDurumu,
      desc: "Mali müşavirinizle değerlendirmeniz önerilir",
    },
  ]);

  const ortaklar = workbook.addWorksheet("Ortaklar");
  row = addReportHeaderBlock(ortaklar, { reportTitle: "Ortaklar", tenantName, recordCount: partners.length });
  const partnerHeader = row;
  ortaklar.addRow(["Ad Soyad", "Ünvan", "Telefon", "E-posta", "Durum"]);
  styleDarkHeaderRow(ortaklar, partnerHeader, 5);
  for (const p of partners) {
    ortaklar.addRow([
      p.adSoyad,
      formatExcelText(p.unvan),
      formatExcelText(p.telefon),
      formatExcelText(p.eposta),
      p.aktifMi ? "Aktif" : "Pasif",
    ]);
  }
  setColumnWidths(ortaklar, [22, 18, 16, 24, 12]);
  finalizeDataTable(ortaklar, partnerHeader, 5);

  const artirim = workbook.addWorksheet("Sermaye Artirimlari");
  row = addReportHeaderBlock(artirim, {
    reportTitle: "Sermaye Artırım Geçmişi",
    tenantName,
    recordCount: increases.length,
  });
  const incHeader = row;
  artirim.addRow(["Tarih", "Önceki Sermaye", "Yeni Sermaye", "Açıklama"]);
  styleDarkHeaderRow(artirim, incHeader, 4);
  for (const inc of increases) {
    artirim.addRow([
      formatExcelDate(inc.tarih),
      inc.oncekiSermaye !== null ? safeMoney(inc.oncekiSermaye) : "—",
      safeMoney(inc.yeniSermaye),
      formatExcelText(inc.aciklama),
    ]);
  }
  setColumnWidths(artirim, [14, 18, 18, 32]);
  applyMoneyFormat(artirim, 2, incHeader + 1);
  applyMoneyFormat(artirim, 3, incHeader + 1);
  finalizeDataTable(artirim, incHeader, 4);

  const hareket = workbook.addWorksheet("Hareketler");
  row = addReportHeaderBlock(hareket, {
    reportTitle: "Sermaye ve Ortak Para Hareketleri",
    tenantName,
    recordCount: transactions.length,
  });
  const txHeader = row;
  hareket.addRow(["Tarih", "Ortak", "Tür", "Hesap", "Açıklama", "Tutar"]);
  styleDarkHeaderRow(hareket, txHeader, 6);
  for (const tx of transactions) {
    const hesapLabel = tx.companyAccount
      ? tx.companyAccount.bankaAdi
        ? `${tx.companyAccount.bankaAdi} - ${tx.companyAccount.hesapAdi}`
        : tx.companyAccount.hesapAdi
      : "—";
    const added = hareket.addRow([
      formatExcelDate(tx.tarih),
      formatExcelText(tx.ortakAdi),
      TRANSACTION_TYPE_LABELS[tx.tur] ?? tx.tur,
      formatExcelText(hesapLabel),
      formatExcelText(tx.aciklama),
      safeMoney(tx.tutar),
    ]);
    if (tx.tur === "PARA_CEKME") {
      applyNetValueStyle(added.getCell(6), -safeMoney(tx.tutar));
    }
  }
  setColumnWidths(hareket, [14, 20, 22, 24, 28, 14]);
  applyMoneyFormat(hareket, 6, txHeader + 1);
  finalizeDataTable(hareket, txHeader, 6);

  return {
    buffer: await workbookToBuffer(workbook),
    filename: `sermaye-${exportFileDate()}.xlsx`,
  };
}
