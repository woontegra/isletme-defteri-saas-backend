import type ExcelJS from "exceljs";
import {
  addReportHeaderBlock,
  applyMoneyFormat,
  applyNetValueStyle,
  applyPercentFormat,
  finalizeDataTable,
  setColumnWidths,
  styleDarkHeaderRow,
  TURKISH_MONEY_FORMAT,
  TURKISH_PERCENT_FORMAT,
  type ReportHeaderMeta,
} from "./excel.styles";
import { formatExportPercent } from "./format.utils";

export interface MetricRow {
  label: string;
  value: string | number;
  desc?: string;
  money?: boolean;
  net?: boolean;
}

export interface AnalysisRow {
  label: string;
  total: number;
  count: number;
  ratio: number;
}

export interface DetailTableConfig {
  headers: string[];
  rows: (string | number)[][];
  widths: number[];
  moneyColumns: number[];
}

const BRAND_FILL = "FF0F172A";
const SECTION_FILL = "FFE2E8F0";

export function addProfessionalHeader(
  sheet: ExcelJS.Worksheet,
  meta: ReportHeaderMeta,
  colSpan = 6
): number {
  sheet.mergeCells(1, 1, 1, colSpan);
  const brand = sheet.getCell(1, 1);
  brand.value = "Woontegra İşletme Defteri";
  brand.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  brand.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_FILL } };
  brand.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  sheet.mergeCells(2, 1, 2, colSpan);
  const title = sheet.getCell(2, 1);
  title.value = meta.reportTitle;
  title.font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  const metaLines = [
    `Şirket: ${meta.tenantName}`,
    meta.periodLabel ? `Dönem: ${meta.periodLabel}` : null,
    meta.recordCount !== undefined ? `Kayıt Sayısı: ${meta.recordCount}` : null,
  ].filter(Boolean);

  sheet.mergeCells(3, 1, 3, colSpan);
  sheet.getCell(3, 1).value = metaLines.join("   |   ");
  sheet.getCell(3, 1).font = { size: 10, color: { argb: "FF475569" } };

  sheet.mergeCells(4, 1, 4, colSpan);
  sheet.getCell(4, 1).value = `Oluşturma: ${new Date().toLocaleString("tr-TR")}`;
  sheet.getCell(4, 1).font = { italic: true, size: 9, color: { argb: "FF64748B" } };

  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 24;
  return 6;
}

export function addSectionTitle(
  sheet: ExcelJS.Worksheet,
  row: number,
  title: string,
  colSpan: number
): number {
  sheet.mergeCells(row, 1, row, colSpan);
  const cell = sheet.getCell(row, 1);
  cell.value = title;
  cell.font = { bold: true, size: 12, color: { argb: "FF0F172A" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SECTION_FILL } };
  cell.alignment = { vertical: "middle", indent: 1 };
  sheet.getRow(row).height = 22;
  return row + 1;
}

export function addMetricTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  rows: MetricRow[],
  colSpan = 3
): number {
  const headerRow = startRow;
  sheet.addRow(["Gösterge", "Değer", "Açıklama"]);
  styleDarkHeaderRow(sheet, headerRow, colSpan);
  let current = headerRow + 1;
  for (const row of rows) {
    const added = sheet.addRow([row.label, row.value, row.desc ?? ""]);
    if (row.money && typeof row.value === "number") {
      added.getCell(2).numFmt = TURKISH_MONEY_FORMAT;
      added.getCell(2).alignment = { horizontal: "right" };
    }
    if (row.net && typeof row.value === "number") {
      applyNetValueStyle(added.getCell(2), row.value);
    }
    current += 1;
  }
  setColumnWidths(sheet, [34, 22, 38]);
  return current + 1;
}

export function addAnalysisTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  rows: AnalysisRow[],
  colSpan = 4
): number {
  let row = addSectionTitle(sheet, startRow, title, colSpan);
  const headerRow = row;
  sheet.addRow(["Kalem", "Toplam", "Kayıt", "Oran"]);
  styleDarkHeaderRow(sheet, headerRow, colSpan);
  row = headerRow + 1;
  if (rows.length === 0) {
    sheet.mergeCells(row, 1, row, colSpan);
    sheet.getCell(row, 1).value = "Bu dönem için kayıt bulunamadı.";
    sheet.getCell(row, 1).font = { italic: true, color: { argb: "FF94A3B8" } };
    return row + 2;
  }
  for (const item of rows) {
    const added = sheet.addRow([item.label, item.total, item.count, item.ratio]);
    added.getCell(2).numFmt = TURKISH_MONEY_FORMAT;
    added.getCell(2).alignment = { horizontal: "right" };
    added.getCell(4).numFmt = TURKISH_PERCENT_FORMAT;
    row += 1;
  }
  applyMoneyFormat(sheet, 2, headerRow + 1);
  applyPercentFormat(sheet, 4, headerRow + 1);
  setColumnWidths(sheet, [28, 18, 12, 12]);
  return row + 1;
}

export function addDetailTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  config: DetailTableConfig
): number {
  const colSpan = config.headers.length;
  let row = addSectionTitle(sheet, startRow, title, Math.min(colSpan, 8));
  const headerRow = row;
  sheet.addRow(config.headers);
  styleDarkHeaderRow(sheet, headerRow, colSpan);
  for (const dataRow of config.rows) {
    sheet.addRow(dataRow);
  }
  setColumnWidths(sheet, config.widths);
  for (const col of config.moneyColumns) {
    applyMoneyFormat(sheet, col, headerRow + 1);
  }
  finalizeDataTable(sheet, headerRow, colSpan);
  return sheet.rowCount + 1;
}

export function setupWorksheetPrint(sheet: ExcelJS.Worksheet, lastRow: number, lastCol: number): void {
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };
  sheet.headerFooter = {
    oddFooter: "&L Woontegra İşletme Defteri &R Sayfa &P / &N",
  };
  if (lastRow > 0 && lastCol > 0) {
    sheet.pageSetup.printArea = `A1:${columnLetter(lastCol)}${lastRow}`;
  }
}

function columnLetter(col: number): string {
  let letter = "";
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

export function formatPercentCell(ratio: number): number {
  return Number.isFinite(ratio) ? ratio : 0;
}

export function percentLabel(ratio: number): string {
  return formatExportPercent(ratio);
}

/** @deprecated use addProfessionalHeader */
export { addReportHeaderBlock };
