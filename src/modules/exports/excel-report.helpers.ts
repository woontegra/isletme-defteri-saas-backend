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
  percent?: boolean;
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

const SECTION_FILL = "FFF0F0F0";
const BORDER = "FF000000";

export function addProfessionalHeader(
  sheet: ExcelJS.Worksheet,
  meta: ReportHeaderMeta,
  colSpan = 6
): number {
  sheet.mergeCells(1, 1, 1, Math.floor(colSpan / 2));
  sheet.mergeCells(1, Math.floor(colSpan / 2) + 1, 1, colSpan);
  const left = sheet.getCell(1, 1);
  left.value = meta.tenantName;
  left.font = { bold: true, size: 12, color: { argb: "FF000000" } };
  left.alignment = { vertical: "top", horizontal: "left", wrapText: true };

  const right = sheet.getCell(1, Math.floor(colSpan / 2) + 1);
  right.value = meta.reportTitle.toUpperCase();
  right.font = { bold: true, size: 12, color: { argb: "FF000000" } };
  right.alignment = { vertical: "top", horizontal: "right", wrapText: true };

  sheet.mergeCells(2, 1, 2, colSpan);
  const metaParts = [
    `Düzenleme tarihi: ${new Date().toLocaleDateString("tr-TR")}`,
    meta.periodLabel ? `Dönem: ${meta.periodLabel}` : null,
    meta.recordCount !== undefined ? `Kayıt Sayısı: ${meta.recordCount}` : null,
  ].filter(Boolean);
  sheet.getCell(2, 1).value = metaParts.join("   |   ");
  sheet.getCell(2, 1).font = { size: 9, color: { argb: "FF333333" } };

  sheet.mergeCells(3, 1, 3, colSpan);
  sheet.getCell(3, 1).border = { bottom: { style: "medium", color: { argb: BORDER } } };

  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 18;
  sheet.getRow(3).height = 6;
  return 5;
}

export function addSectionTitle(
  sheet: ExcelJS.Worksheet,
  row: number,
  title: string,
  colSpan: number
): number {
  sheet.mergeCells(row, 1, row, colSpan);
  const cell = sheet.getCell(row, 1);
  cell.value = title.toUpperCase();
  cell.font = { bold: true, size: 10, color: { argb: "FF000000" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SECTION_FILL } };
  cell.alignment = { vertical: "middle" };
  cell.border = {
    bottom: { style: "thin", color: { argb: BORDER } },
  };
  sheet.getRow(row).height = 20;
  return row + 1;
}

export function addSummaryCardGrid(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  cards: Array<{ label: string; value: string | number; money?: boolean }>,
  colSpan = 6
): number {
  let row = addSectionTitle(sheet, startRow, "Finansal Özet Kartları", colSpan);
  const cardsPerRow = 3;
  const cardWidth = Math.floor(colSpan / cardsPerRow);

  for (let i = 0; i < cards.length; i += cardsPerRow) {
    const chunk = cards.slice(i, i + cardsPerRow);
    const labelRow = sheet.getRow(row);
    const valueRow = sheet.getRow(row + 1);
    labelRow.height = 18;
    valueRow.height = 26;

    chunk.forEach((card, idx) => {
      const startCol = idx * cardWidth + 1;
      const endCol = startCol + cardWidth - 1;
      sheet.mergeCells(row, startCol, row, endCol);
      sheet.mergeCells(row + 1, startCol, row + 1, endCol);

      const labelCell = sheet.getCell(row, startCol);
      labelCell.value = card.label;
      labelCell.font = { size: 9, color: { argb: "FF64748B" }, bold: true };
      labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      labelCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      labelCell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      const valueCell = sheet.getCell(row + 1, startCol);
      valueCell.value = card.value;
      valueCell.font = { size: 14, bold: true, color: { argb: "FF0F172A" } };
      valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
      valueCell.alignment = { vertical: "middle", horizontal: card.money ? "right" : "left", indent: 1 };
      valueCell.border = {
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (card.money && typeof card.value === "number") {
        valueCell.numFmt = TURKISH_MONEY_FORMAT;
      }
    });
    row += 2;
  }
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
    if (row.percent && typeof row.value === "number") {
      added.getCell(2).numFmt = TURKISH_PERCENT_FORMAT;
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
