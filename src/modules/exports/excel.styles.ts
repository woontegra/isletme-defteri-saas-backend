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

export const TURKISH_MONEY_FORMAT = '#.##0,00" ₺"';
export const TURKISH_PERCENT_FORMAT = "0.0%";

const DARK_HEADER_FILL = "FF0F172A";
const DARK_HEADER_FONT = "FFFFFFFF";
const POSITIVE_FILL = "FFD1FAE5";
const POSITIVE_FONT = "FF047857";
const NEGATIVE_FILL = "FFFEE2E2";
const NEGATIVE_FONT = "FFB91C1C";

export interface ReportHeaderMeta {
  reportTitle: string;
  tenantName: string;
  periodLabel?: string;
  recordCount?: number;
}

export function styleDarkHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number, colSpan = 1): void {
  const row = sheet.getRow(rowNumber);
  row.height = 24;
  row.font = { bold: true, color: { argb: DARK_HEADER_FONT }, size: 11 };
  row.alignment = { vertical: "middle", horizontal: "center" };
  for (let c = 1; c <= colSpan; c += 1) {
    const cell = row.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: DARK_HEADER_FILL },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF1E293B" } },
      left: { style: "thin", color: { argb: "FF1E293B" } },
      bottom: { style: "thin", color: { argb: "FF1E293B" } },
      right: { style: "thin", color: { argb: "FF1E293B" } },
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

export function applyNetValueStyle(cell: ExcelJS.Cell, value: number): void {
  if (!Number.isFinite(value) || value === 0) return;
  if (value > 0) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: POSITIVE_FILL } };
    cell.font = { color: { argb: POSITIVE_FONT }, bold: true };
  } else {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NEGATIVE_FILL } };
    cell.font = { color: { argb: NEGATIVE_FONT }, bold: true };
  }
}

export function addReportHeaderBlock(
  sheet: ExcelJS.Worksheet,
  meta: ReportHeaderMeta
): number {
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "Woontegra İşletme Defteri";
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF0EA5E9" } };

  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value = meta.reportTitle;
  sheet.getCell("A2").font = { bold: true, size: 13 };

  sheet.mergeCells("A3:F3");
  sheet.getCell("A3").value = `Şirket: ${meta.tenantName}`;

  sheet.mergeCells("A4:F4");
  const periodText = meta.periodLabel ? `Dönem: ${meta.periodLabel}` : undefined;
  const countText =
    meta.recordCount !== undefined ? `Kayıt Sayısı: ${meta.recordCount}` : undefined;
  sheet.getCell("A4").value = [periodText, countText].filter(Boolean).join("  |  ");

  sheet.mergeCells("A5:F5");
  sheet.getCell("A5").value = `Oluşturma: ${formatExportDateTime()}`;
  sheet.getCell("A5").font = { italic: true, color: { argb: "FF64748B" } };

  return 7;
}

export function applyDataRowStyles(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  columnCount: number
): void {
  const LIGHT_FILL = "FFF8FAFC";
  const BORDER = "FFE2E8F0";
  for (let r = startRow; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    if (r % 2 === 0) {
      for (let c = 1; c <= columnCount; c += 1) {
        const cell = row.getCell(c);
        if (!cell.fill) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_FILL } };
        }
      }
    }
    for (let c = 1; c <= columnCount; c += 1) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: "thin", color: { argb: BORDER } },
        left: { style: "thin", color: { argb: BORDER } },
        bottom: { style: "thin", color: { argb: BORDER } },
        right: { style: "thin", color: { argb: BORDER } },
      };
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
