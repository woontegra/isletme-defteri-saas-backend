export type PdfCellAlign = "left" | "right" | "center";

export type PdfColumnKind = "text" | "date" | "money" | "type" | "wrap" | "nowrap" | "wrap-soft";

export interface PdfTableColumn {
  header: string;
  width: string;
  kind?: PdfColumnKind;
  align?: PdfCellAlign;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function safeCellText(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const trimmed = String(value).trim();
  if (!trimmed) return "—";
  return escapeHtml(trimmed);
}

function cellClass(col: PdfTableColumn): string {
  const classes: string[] = [];
  const kind = col.kind ?? "text";
  if (kind === "date") classes.push("cell-date");
  if (kind === "nowrap" || kind === "type") classes.push("cell-nowrap");
  if (kind === "money") classes.push("cell-money");
  if (kind === "wrap") classes.push("cell-wrap");
  if (kind === "wrap-soft") classes.push("cell-wrap-soft");
  if (col.align === "right") classes.push("cell-right");
  if (col.align === "center") classes.push("cell-center");
  return classes.length ? ` class="${classes.join(" ")}"` : "";
}

export function buildPdfTable(
  columns: PdfTableColumn[],
  rows: string[][],
  options?: { emptyText?: string; tableClass?: string }
): string {
  if (rows.length === 0) {
    return `<div class="empty">${options?.emptyText ?? "Kayıt bulunamadı."}</div>`;
  }

  const tableClass = ["official-table", options?.tableClass].filter(Boolean).join(" ");
  const colgroup = columns.map((c) => `<col style="width:${c.width}">`).join("");
  const head = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join("");

  const body = rows
    .map((row) => {
      const cells = row
        .map((cell, idx) => {
          const col = columns[idx];
          if (!col) return `<td>${cell}</td>`;
          return `<td${cellClass(col)}>${cell}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<table class="${tableClass}"><colgroup>${colgroup}</colgroup><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function buildPdfTableLegacy(
  headers: string[],
  rows: string[][],
  moneyCols: number[] = [],
  emptyText?: string
): string {
  const defaultWidth = `${Math.floor(100 / Math.max(headers.length, 1))}%`;
  const columns: PdfTableColumn[] = headers.map((header, idx) => ({
    header,
    width: defaultWidth,
    kind: moneyCols.includes(idx)
      ? "money"
      : header.toLowerCase().includes("tarih") || header.toLowerCase().includes("vade")
        ? "date"
        : "text",
    align: moneyCols.includes(idx) ? "right" : "left",
  }));
  return buildPdfTable(columns, rows, { emptyText });
}

export const PDF_TABLE_STYLES = `
  table.official-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; table-layout: fixed; }
  table.official-table th { background: #f0f0f0; color: #000; text-align: left; padding: 5px 7px; font-size: 8.5pt; font-weight: bold; border: 1px solid #000; vertical-align: middle; }
  table.official-table td { border: 1px solid #000; padding: 4px 7px; vertical-align: top; font-size: 8.5pt; line-height: 1.35; overflow: hidden; }
  table.official-table tr { page-break-inside: avoid; break-inside: avoid; }
  table.official-table .cell-nowrap { white-space: nowrap; word-break: keep-all; overflow: hidden; text-overflow: ellipsis; }
  table.official-table .cell-money { text-align: right; white-space: nowrap; word-break: keep-all; font-variant-numeric: tabular-nums; }
  table.official-table .cell-right { text-align: right; }
  table.official-table .cell-center { text-align: center; }
  table.official-table .cell-wrap { white-space: normal; word-break: break-word; overflow-wrap: anywhere; line-height: 1.35; max-height: 2.6em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
`;

export const CAPITAL_MOVEMENT_COLUMNS: PdfTableColumn[] = [
  { header: "Tarih", width: "13%", kind: "date" },
  { header: "Ortak", width: "15%", kind: "nowrap" },
  { header: "İşlem Türü", width: "20%", kind: "wrap-soft" },
  { header: "Hesap", width: "20%", kind: "wrap-soft" },
  { header: "Açıklama", width: "20%", kind: "wrap-soft" },
  { header: "Tutar", width: "12%", kind: "money", align: "right" },
];

/** Capital movement table: no ellipsis, compact font, full date/type visibility */
export const CAPITAL_MOVEMENT_PDF_STYLES = `
  table.capital-movements-table { font-size: 8pt; }
  table.capital-movements-table th { font-size: 8pt; padding: 3px 5px; }
  table.capital-movements-table td { font-size: 8pt; padding: 3px 5px; overflow: visible; vertical-align: top; }
  table.capital-movements-table .cell-date,
  table.capital-movements-table .cell-nowrap { white-space: nowrap; overflow: visible; text-overflow: clip; word-break: keep-all; }
  table.capital-movements-table .cell-money { text-align: right; white-space: nowrap; overflow: visible; text-overflow: clip; font-variant-numeric: tabular-nums; }
  table.capital-movements-table .cell-wrap-soft { white-space: normal; word-break: break-word; overflow-wrap: break-word; overflow: visible; line-height: 1.3; }
`;

export const EXPENSE_DETAIL_COLUMNS: PdfTableColumn[] = [
  { header: "Tarih", width: "10%", kind: "date" },
  { header: "Kategori", width: "14%", kind: "type" },
  { header: "Firma / Tedarikçi", width: "16%", kind: "wrap" },
  { header: "Açıklama", width: "26%", kind: "wrap" },
  { header: "Tutar", width: "12%", kind: "money", align: "right" },
  { header: "Ödeme Durumu", width: "11%", kind: "type" },
  { header: "Fiş/Fatura", width: "11%", kind: "type" },
];

export const INCOME_DETAIL_COLUMNS: PdfTableColumn[] = [
  { header: "Tarih", width: "9%", kind: "date" },
  { header: "Ürün / Hizmet", width: "14%", kind: "wrap" },
  { header: "Müşteri", width: "14%", kind: "wrap" },
  { header: "Satış Türü", width: "12%", kind: "type" },
  { header: "Dönem / Paket", width: "12%", kind: "wrap" },
  { header: "Tutar", width: "11%", kind: "money", align: "right" },
  { header: "Tahsil Durumu", width: "11%", kind: "type" },
  { header: "Fatura", width: "9%", kind: "type" },
];
