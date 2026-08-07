import ExcelJS from "exceljs";
import {
  getCapitalSettings,
  getCapitalSummary,
  listCapitalIncreases,
  listCapitalPartners,
  listPartnerCapitalTransactions,
} from "../capital/capital.service";
import { listCompanyAccounts } from "../settings/company-account.service";
import {
  COMPANY_ACCOUNT_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  WARNING_LABELS,
} from "./export-labels";
import { exportFileDate, formatExportDateTime, safeMoney } from "./format.utils";
import {
  applyDataRowStyles,
  formatExcelDate,
  formatExcelText,
  TURKISH_DATETIME_FORMAT,
  TURKISH_PERCENT_FORMAT,
  workbookToBuffer,
} from "./excel.styles";
import { getExportCompanyInfo } from "./tenant-meta";

const MONEY_FORMAT = '#,##0.00 "₺"';
const HEADER_FILL = "FFF0F0F0";
const BORDER = "FFCCCCCC";

type CellValue = string | number | Date | null;

interface TableOptions {
  widths: number[];
  moneyColumns?: number[];
  percentColumns?: number[];
  dateColumns?: number[];
  dateTimeColumns?: number[];
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number, colCount: number): void {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, size: 10 };
  row.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  for (let c = 1; c <= colCount; c += 1) {
    const cell = row.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER } },
      left: { style: "thin", color: { argb: BORDER } },
      bottom: { style: "thin", color: { argb: BORDER } },
      right: { style: "thin", color: { argb: BORDER } },
    };
  }
  row.height = 20;
}

function applyCellFormats(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  options: TableOptions
): void {
  for (const col of options.moneyColumns ?? []) {
    const cell = sheet.getCell(rowNumber, col);
    if (typeof cell.value === "number") {
      cell.numFmt = MONEY_FORMAT;
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  }
  for (const col of options.percentColumns ?? []) {
    const cell = sheet.getCell(rowNumber, col);
    if (typeof cell.value === "number") {
      cell.numFmt = TURKISH_PERCENT_FORMAT;
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  }
  for (const col of options.dateColumns ?? []) {
    const cell = sheet.getCell(rowNumber, col);
    if (cell.value instanceof Date) {
      cell.numFmt = "dd.mm.yyyy";
      cell.alignment = { horizontal: "left", vertical: "middle" };
    }
  }
  for (const col of options.dateTimeColumns ?? []) {
    const cell = sheet.getCell(rowNumber, col);
    if (cell.value instanceof Date) {
      cell.numFmt = TURKISH_DATETIME_FORMAT;
      cell.alignment = { horizontal: "left", vertical: "middle" };
    }
  }
}

function writeDataTable(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  headers: string[],
  rows: CellValue[][],
  options: TableOptions
): number {
  const colCount = headers.length;

  headers.forEach((header, idx) => {
    sheet.getCell(headerRow, idx + 1).value = header;
  });
  styleHeaderRow(sheet, headerRow, colCount);

  let row = headerRow + 1;
  for (const data of rows) {
    data.forEach((value, idx) => {
      sheet.getCell(row, idx + 1).value = value;
    });
    applyCellFormats(sheet, row, options);
    row += 1;
  }

  options.widths.forEach((width, idx) => {
    sheet.getColumn(idx + 1).width = width;
  });

  if (rows.length > 0) {
    applyDataRowStyles(sheet, headerRow + 1, colCount);
    for (const col of options.moneyColumns ?? []) {
      sheet.getColumn(col).numFmt = MONEY_FORMAT;
    }
  }

  for (let c = 1; c <= colCount; c += 1) {
    sheet.getColumn(c).alignment = { ...sheet.getColumn(c).alignment, wrapText: true, vertical: "middle" };
  }

  sheet.views = [{ state: "frozen", ySplit: headerRow, activeCell: `A${headerRow + 1}` }];
  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: Math.max(headerRow, row - 1), column: colCount },
  };

  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, paperSize: 9 };

  return row;
}

function writeOzetSheet(
  sheet: ExcelJS.Worksheet,
  tenantName: string,
  summary: Awaited<ReturnType<typeof getCapitalSummary>>
): void {
  sheet.getCell(1, 1).value = "Woontegra İşletme Defteri";
  sheet.getCell(1, 1).font = { bold: true, size: 12 };
  sheet.getCell(2, 1).value = "Sermaye / Şirket Bilgileri Özeti";
  sheet.getCell(2, 1).font = { bold: true, size: 11 };
  sheet.getCell(3, 1).value = "Şirket";
  sheet.getCell(3, 2).value = tenantName;
  sheet.getCell(4, 1).value = "Oluşturma Tarihi";
  sheet.getCell(4, 2).value = formatExportDateTime();

  const headerRow = 6;
  const rows: CellValue[][] = [
    [
      "Ana Sermaye",
      safeMoney(summary.anaSermaye),
      "Şirket ayarlarında tanımlı ana sermaye",
    ],
    [
      "Ödenen Ana Sermaye",
      safeMoney(summary.toplamAnaSermayeOdemesi),
      "Ana sermaye ödemesi hareketleri toplamı",
    ],
    [
      "Kalan Ana Sermaye",
      safeMoney(summary.kalanAnaSermayeOdemesi),
      "Ana sermaye - ödenen ana sermaye",
    ],
    ["Ana Sermaye Ödeme Oranı", summary.anaSermayeOdemeOrani, ""],
    ["Ortak Para Limiti", safeMoney(summary.ortakParaLimiti), ""],
    [
      "Net Ortak Alacağı",
      safeMoney(summary.netOrtakAlacagi),
      "Ortak para koyma - para çekme",
    ],
    [
      "Kalan Ortak Para Limiti",
      safeMoney(summary.kalanLimit),
      "Ortak para limiti - net ortak alacağı",
    ],
    ["Ortak Para Kullanım Oranı", summary.kullanimOrani, ""],
    [
      "Uyarı Durumu",
      WARNING_LABELS[summary.uyariDurumu] ?? summary.uyariDurumu,
      "",
    ],
  ];

  writeDataTable(sheet, headerRow, ["Gösterge", "Değer", "Açıklama"], rows, {
    widths: [32, 20, 48],
  });

  const moneyDataRows = [7, 8, 9, 11, 12, 13];
  const percentDataRows = [10, 14];
  for (const r of moneyDataRows) {
    applyCellFormats(sheet, r, { widths: [], moneyColumns: [2] });
  }
  for (const r of percentDataRows) {
    applyCellFormats(sheet, r, { widths: [], percentColumns: [2] });
  }
}

function writeKeyValueSheet(
  sheet: ExcelJS.Worksheet,
  rows: Array<{ label: string; value: CellValue; money?: boolean; percent?: boolean }>
): void {
  const data: CellValue[][] = rows.map((r) => [r.label, r.value]);
  writeDataTable(sheet, 1, ["Alan", "Değer"], data, { widths: [36, 28] });

  rows.forEach((item, idx) => {
    const row = idx + 2;
    if (item.money) {
      applyCellFormats(sheet, row, { widths: [], moneyColumns: [2] });
    } else if (item.percent) {
      applyCellFormats(sheet, row, { widths: [], percentColumns: [2] });
    }
  });
}

export async function buildCapitalExcel(
  tenantId: string
): Promise<{ buffer: Buffer; filename: string }> {
  const [settings, summary, increases, partners, transactions, accounts, company] =
    await Promise.all([
      getCapitalSettings(tenantId),
      getCapitalSummary(tenantId),
      listCapitalIncreases(tenantId),
      listCapitalPartners(tenantId),
      listPartnerCapitalTransactions(tenantId),
      listCompanyAccounts(tenantId),
      getExportCompanyInfo(tenantId),
    ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Woontegra";
  workbook.created = new Date();

  const tenantName = company.tenantName;

  // 1. Ozet
  writeOzetSheet(workbook.addWorksheet("Ozet"), tenantName, summary);

  // 2. Sirket Bilgileri
  writeKeyValueSheet(workbook.addWorksheet("Sirket Bilgileri"), [
    { label: "Şirket Ünvanı", value: formatExcelText(settings.sirketUnvani ?? tenantName) },
    { label: "Kuruluş Tarihi", value: formatExcelDate(settings.kurulusTarihi) },
    {
      label: "Ticaret Sicil Gazetesi Yayın Tarihi",
      value: formatExcelDate(settings.ticaretSicilGazeteTarihi),
    },
    { label: "Ana Sermaye", value: safeMoney(settings.anaSermaye), money: true },
    { label: "Ortak Para Çarpanı", value: Number(settings.ortakParaCarpani) },
    { label: "Uyarı Oranı", value: settings.uyariOrani, percent: true },
    {
      label: "Son Sermaye Artırım Tarihi",
      value: formatExcelDate(settings.sonSermayeArtirimTarihi),
    },
    { label: "Notlar", value: formatExcelText(settings.notlar) },
  ]);

  // 3. Ortaklar
  writeDataTable(
    workbook.addWorksheet("Ortaklar"),
    1,
    ["Ad Soyad", "Ünvan", "Telefon", "E-posta", "Durum", "Oluşturma Tarihi", "Güncelleme Tarihi"],
    partners.map((p) => [
      p.adSoyad,
      formatExcelText(p.unvan),
      formatExcelText(p.telefon),
      formatExcelText(p.eposta),
      p.aktifMi ? "Aktif" : "Pasif",
      parseIsoDate(p.createdAt),
      parseIsoDate(p.updatedAt),
    ]),
    {
      widths: [22, 16, 14, 26, 10, 18, 18],
      dateTimeColumns: [6, 7],
    }
  );

  // 4. Banka Kasa Hesaplari
  writeDataTable(
    workbook.addWorksheet("Banka Kasa Hesaplari"),
    1,
    [
      "Hesap Adı",
      "Hesap Türü",
      "Banka Adı",
      "IBAN",
      "Hesap No",
      "Para Birimi",
      "Açıklama",
      "Durum",
      "Oluşturma Tarihi",
      "Güncelleme Tarihi",
    ],
    accounts.map((acc) => [
      acc.hesapAdi,
      COMPANY_ACCOUNT_TYPE_LABELS[acc.hesapTuru] ?? acc.hesapTuru,
      formatExcelText(acc.bankaAdi),
      formatExcelText(acc.iban),
      formatExcelText(acc.hesapNo),
      acc.paraBirimi,
      formatExcelText(acc.aciklama),
      acc.aktifMi ? "Aktif" : "Pasif",
      parseIsoDate(acc.createdAt),
      parseIsoDate(acc.updatedAt),
    ]),
    {
      widths: [22, 12, 20, 26, 14, 10, 24, 10, 18, 18],
      dateTimeColumns: [9, 10],
    }
  );

  // 5. Sermaye Hareketleri (tarih yeniden eskiye — API zaten desc sıralıyor)
  writeDataTable(
    workbook.addWorksheet("Sermaye Hareketleri"),
    1,
    [
      "Tarih",
      "Ortak",
      "İşlem Türü",
      "Hesap",
      "Banka Adı",
      "Açıklama",
      "Tutar",
      "Oluşturma Tarihi",
      "Güncelleme Tarihi",
    ],
    transactions.map((tx) => [
      parseIsoDate(tx.tarih),
      formatExcelText(tx.ortakAdi),
      TRANSACTION_TYPE_LABELS[tx.tur] ?? tx.tur,
      formatExcelText(tx.companyAccount?.hesapAdi),
      formatExcelText(tx.companyAccount?.bankaAdi),
      formatExcelText(tx.aciklama),
      safeMoney(tx.tutar),
      parseIsoDate(tx.createdAt),
      parseIsoDate(tx.updatedAt),
    ]),
    {
      widths: [12, 18, 22, 20, 18, 28, 14, 18, 18],
      moneyColumns: [7],
      dateColumns: [1],
      dateTimeColumns: [8, 9],
    }
  );

  // 6. Sermaye Artirimlari
  const artirimSheet = workbook.addWorksheet("Sermaye Artirimlari");
  if (increases.length === 0) {
    artirimSheet.getCell(2, 1).value = "Henüz sermaye artırımı kaydı bulunmuyor.";
    artirimSheet.getCell(2, 1).font = { italic: true };
    artirimSheet.getColumn(1).width = 48;
  } else {
    writeDataTable(
      artirimSheet,
      1,
      [
        "Tarih",
        "Önceki Sermaye",
        "Yeni Sermaye",
        "Açıklama",
        "Oluşturma Tarihi",
        "Güncelleme Tarihi",
      ],
      increases.map((inc) => [
        parseIsoDate(inc.tarih),
        inc.oncekiSermaye !== null ? safeMoney(inc.oncekiSermaye) : null,
        safeMoney(inc.yeniSermaye),
        formatExcelText(inc.aciklama),
        parseIsoDate(inc.createdAt),
        parseIsoDate(inc.updatedAt),
      ]),
      {
        widths: [12, 16, 16, 36, 18, 18],
        moneyColumns: [2, 3],
        dateColumns: [1],
        dateTimeColumns: [5, 6],
      }
    );
  }

  return {
    buffer: await workbookToBuffer(workbook),
    filename: `sermaye-${exportFileDate()}.xlsx`,
  };
}
