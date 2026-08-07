import type ExcelJS from "exceljs";
import { formatExportDate, formatExportDateTime } from "./format.utils";

export {
  exportFileDate,
  safeMoney,
  formatExportDate as formatExcelDate,
  formatExportDateTime as formatExcelDateTime,
} from "./format.utils";

export function formatExcelText(value: string | null | undefined): string {
  if (!value || !value.trim()) return "—";
  return value.trim();
}

export function formatExcelBoolean(value: boolean): string {
  return value ? "Evet" : "Hayır";
}

/** Excel custom format: 2 decimal TRY, e.g. ₺100.000,00 in Turkish locale */
export const TURKISH_MONEY_FORMAT = '"₺"#,##0.00';
export const TURKISH_PERCENT_FORMAT = "0.0%";
export const TURKISH_DATE_FORMAT = "dd.mm.yyyy";
export const TURKISH_DATETIME_FORMAT = "dd.mm.yyyy hh:mm";

const OFFICIAL_HEADER_FILL = "FFF0F0F0";
const OFFICIAL_HEADER_FONT = "FF000000";
const OFFICIAL_BORDER = "FF000000";

export interface ReportHeaderMeta {
  reportTitle: string;
  tenantName: string;
  periodLabel?: string;
  recordCount?: number;
}

export function styleDarkHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number, colSpan = 1): void {
  const row = sheet.getRow(rowNumber);
  row.height = 22;
  row.font = { bold: true, color: { argb: OFFICIAL_HEADER_FONT }, size: 10 };
  row.alignment = { vertical: "middle", horizontal: "left" };
  for (let c = 1; c <= colSpan; c += 1) {
    const cell = row.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: OFFICIAL_HEADER_FILL },
    };
    cell.border = {
      top: { style: "thin", color: { argb: OFFICIAL_BORDER } },
      left: { style: "thin", color: { argb: OFFICIAL_BORDER } },
      bottom: { style: "thin", color: { argb: OFFICIAL_BORDER } },
      right: { style: "thin", color: { argb: OFFICIAL_BORDER } },
    };
  }
}

export function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNumber = 1): void {
  styleDarkHeaderRow(sheet, rowNumber, sheet.columnCount || 6);
}

export function setColumnWidths(sheet: ExcelJS.Worksheet, widths: number[]): void {
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
}

export function applyMoneyFormat(
  sheet: ExcelJS.Worksheet,
  columnIndex: number,
  startRow = 2
): void {
  const col = sheet.getColumn(columnIndex);
  col.numFmt = TURKISH_MONEY_FORMAT;
  col.alignment = { horizontal: "right" };
  for (let r = startRow; r <= sheet.rowCount; r += 1) {
    const cell = sheet.getCell(r, columnIndex);
    if (typeof cell.value === "number") {
      cell.numFmt = TURKISH_MONEY_FORMAT;
    }
  }
}

export function applyPercentFormat(
  sheet: ExcelJS.Worksheet,
  columnIndex: number,
  startRow: number
): void {
  for (let r = startRow; r <= sheet.rowCount; r += 1) {
    const cell = sheet.getCell(r, columnIndex);
    if (typeof cell.value === "number") {
      cell.numFmt = TURKISH_PERCENT_FORMAT;
    }
  }
}

export function applyNetValueStyle(cell: ExcelJS.Cell, _value: number): void {
  cell.font = { bold: true, color: { argb: OFFICIAL_HEADER_FONT } };
}

export function addReportHeaderBlock(
  sheet: ExcelJS.Worksheet,
  meta: ReportHeaderMeta
): number {
  return addProfessionalHeaderFromStyles(sheet, meta, 6);
}

function addProfessionalHeaderFromStyles(
  sheet: ExcelJS.Worksheet,
  meta: ReportHeaderMeta,
  colSpan: number
): number {
  sheet.mergeCells(1, 1, 1, Math.floor(colSpan / 2));
  sheet.mergeCells(1, Math.floor(colSpan / 2) + 1, 1, colSpan);
  sheet.getCell(1, 1).value = meta.tenantName;
  sheet.getCell(1, 1).font = { bold: true, size: 12 };
  sheet.getCell(1, Math.floor(colSpan / 2) + 1).value = meta.reportTitle.toUpperCase();
  sheet.getCell(1, Math.floor(colSpan / 2) + 1).font = { bold: true, size: 12 };
  sheet.getCell(1, Math.floor(colSpan / 2) + 1).alignment = { horizontal: "right" };

  sheet.mergeCells(2, 1, 2, colSpan);
  const parts = [
    `Düzenleme tarihi: ${formatExportDate(new Date())}`,
    meta.periodLabel ? `Dönem: ${meta.periodLabel}` : null,
    meta.recordCount !== undefined ? `Kayıt Sayısı: ${meta.recordCount}` : null,
  ].filter(Boolean);
  sheet.getCell(2, 1).value = parts.join("   |   ");
  sheet.getCell(2, 1).font = { size: 9 };

  sheet.mergeCells(3, 1, 3, colSpan);
  sheet.getCell(3, 1).border = { bottom: { style: "medium", color: { argb: OFFICIAL_BORDER } } };
  return 5;
}

export function applyDataRowStyles(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  columnCount: number
): void {
  for (let r = startRow; r <= sheet.rowCount; r += 1) {
    for (let c = 1; c <= columnCount; c += 1) {
      const cell = sheet.getRow(r).getCell(c);
      cell.border = {
        top: { style: "thin", color: { argb: OFFICIAL_BORDER } },
        left: { style: "thin", color: { argb: OFFICIAL_BORDER } },
        bottom: { style: "thin", color: { argb: OFFICIAL_BORDER } },
        right: { style: "thin", color: { argb: OFFICIAL_BORDER } },
      };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    }
  }
}

export function finalizeDataTable(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  columnCount: number
): void {
  sheet.views = [{ state: "frozen", ySplit: headerRow }];
  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: Math.max(headerRow, sheet.rowCount), column: columnCount },
  };
  for (let c = 1; c <= columnCount; c += 1) {
    const col = sheet.getColumn(c);
    col.alignment = { vertical: "middle", wrapText: true };
  }
  if (sheet.rowCount > headerRow) {
    applyDataRowStyles(sheet, headerRow + 1, columnCount);
  }
}

export function addEmptyMessageRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  message: string,
  colSpan: number
): void {
  sheet.mergeCells(rowNumber, 1, rowNumber, colSpan);
  const cell = sheet.getCell(rowNumber, 1);
  cell.value = message;
  cell.font = { italic: true, color: { argb: "FF64748B" } };
  cell.alignment = { horizontal: "center" };
}

export async function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
