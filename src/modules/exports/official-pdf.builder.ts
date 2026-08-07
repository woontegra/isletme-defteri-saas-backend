import type { ExportCompanyInfo } from "./tenant-meta";
import {
  buildPdfTable,
  buildPdfTableLegacy,
  escapeHtml,
  safeCellText,
  type PdfTableColumn,
} from "./pdf-table.builder";
import { formatExportCurrency, formatExportDate, formatExportDateTime } from "./format.utils";

import { PDF_TABLE_STYLES } from "./pdf-table.builder";

export const OFFICIAL_PDF_STYLES = `
  ${PDF_TABLE_STYLES}
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; background: #fff; margin: 0; padding: 14mm 12mm; line-height: 1.4; }
  .letterhead { display: table; width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px; }
  .letterhead-left, .letterhead-right { display: table-cell; vertical-align: top; width: 50%; }
  .letterhead-right { text-align: right; }
  .company-name { font-size: 11pt; font-weight: bold; margin-bottom: 4px; }
  .company-line { font-size: 9pt; margin: 1px 0; }
  .report-title { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; }
  .report-meta { font-size: 9pt; margin: 2px 0; }
  .section-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #000; }
  table.kv-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table.kv-table td { border: 1px solid #000; padding: 4px 8px; font-size: 9pt; vertical-align: top; }
  table.kv-table td.label { width: 38%; font-weight: bold; background: #f5f5f5; }
  .totals-box { border: 2px solid #000; margin-top: 12px; margin-bottom: 12px; }
  .totals-box table { width: 100%; border-collapse: collapse; }
  .totals-box td { border: 1px solid #000; padding: 5px 8px; font-size: 9pt; font-weight: bold; }
  .totals-box td:last-child { text-align: right; white-space: nowrap; }
  .footer-note { font-size: 8pt; color: #333; margin-top: 18px; font-style: italic; border-top: 1px solid #ccc; padding-top: 8px; }
  .empty { font-size: 9pt; font-style: italic; padding: 8px 0; color: #444; }
  .page-break { page-break-before: always; }
`;

export function wrapOfficialPdf(documentTitle: string, body: string): string {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/><title>${escapeHtml(documentTitle)}</title><style>${OFFICIAL_PDF_STYLES}</style></head><body>${body}<div class="footer-note">Bu rapor sistemde kayıtlı verilere göre oluşturulmuştur. · Woontegra İşletme Defteri · ${formatExportDateTime()}</div></body></html>`;
}

export function buildLetterhead(
  company: ExportCompanyInfo,
  reportTitle: string,
  periodLabel?: string
): string {
  const addressParts = [company.adres, company.ilce, company.sehir].filter(Boolean);
  const addressLine = addressParts.length > 0 ? addressParts.join(", ") : null;

  const leftLines = [
    `<div class="company-name">${safeCellText(company.firmaUnvani ?? company.tenantName)}</div>`,
    company.vergiDairesi ? `<div class="company-line">Vergi Dairesi: ${safeCellText(company.vergiDairesi)}</div>` : "",
    company.vergiNo ? `<div class="company-line">Vergi No: ${safeCellText(company.vergiNo)}</div>` : "",
    company.telefon ? `<div class="company-line">Telefon: ${safeCellText(company.telefon)}</div>` : "",
    company.eposta ? `<div class="company-line">E-posta: ${safeCellText(company.eposta)}</div>` : "",
    addressLine ? `<div class="company-line">Adres: ${safeCellText(addressLine)}</div>` : "",
  ]
    .filter(Boolean)
    .join("");

  const rightLines = [
    `<div class="report-title">${escapeHtml(reportTitle)}</div>`,
    `<div class="report-meta">Düzenleme tarihi: ${formatExportDate(new Date())}</div>`,
    periodLabel ? `<div class="report-meta">Dönem: ${escapeHtml(periodLabel)}</div>` : "",
  ]
    .filter(Boolean)
    .join("");

  return `<div class="letterhead"><div class="letterhead-left">${leftLines}</div><div class="letterhead-right">${rightLines}</div></div>`;
}

export function buildCompanyInfoSection(company: ExportCompanyInfo): string {
  const addressParts = [company.adres, company.ilce, company.sehir].filter(Boolean);
  const rows: Array<[string, string]> = [
    ["Firma Ünvanı", safeCellText(company.firmaUnvani ?? company.tenantName)],
    ["Vergi Dairesi", safeCellText(company.vergiDairesi)],
    ["Vergi No", safeCellText(company.vergiNo)],
    ["Telefon", safeCellText(company.telefon)],
    ["E-posta", safeCellText(company.eposta)],
    ["Adres", safeCellText(addressParts.join(", ") || null)],
  ];
  return buildSectionTitle("ŞİRKET BİLGİLERİ") + buildKvTable(rows);
}

export function buildSectionTitle(title: string): string {
  return `<div class="section-title">${escapeHtml(title)}</div>`;
}

export function buildKvTable(rows: Array<[string, string]>): string {
  const body = rows
    .map(([label, value]) => `<tr><td class="label">${label}</td><td>${value}</td></tr>`)
    .join("");
  return `<table class="kv-table">${body}</table>`;
}

export function buildSummaryTable(rows: Array<[string, string]>): string {
  return buildSectionTitle("RAPOR ÖZETİ") + buildKvTable(rows);
}

export function buildDataTable(
  title: string,
  headers: string[],
  rows: string[][],
  options?: { columns?: PdfTableColumn[]; moneyCols?: number[]; emptyText?: string }
): string {
  const table = options?.columns
    ? buildPdfTable(options.columns, rows, { emptyText: options.emptyText })
    : buildPdfTableLegacy(headers, rows, options?.moneyCols ?? [], options?.emptyText);
  return buildSectionTitle(title) + table;
}

export function buildTotalsBox(rows: Array<[string, string]>): string {
  const body = rows
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${value}</td></tr>`)
    .join("");
  return `<div class="totals-box"><table>${body}</table></div>`;
}

export function moneyCell(value: number): string {
  return safeCellText(formatExportCurrency(value));
}
