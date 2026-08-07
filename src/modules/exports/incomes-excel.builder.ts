import ExcelJS from "exceljs";
import type { IncomeRecord } from "@prisma/client";
import { INCOME_SALE_TYPE_LABELS, INCOME_STATUS_LABELS } from "./export-labels";
import { countWhere, sumAmount, sumWhere } from "./export-analytics";
import {
  addDetailTable,
  addMetricTable,
  addProfessionalHeader,
  addSectionTitle,
  setupWorksheetPrint,
} from "./excel-report.helpers";
import { exportFileDate, safeMoney } from "./format.utils";
import {
  formatExcelBoolean,
  formatExcelDate,
  formatExcelText,
  workbookToBuffer,
} from "./excel.styles";

export async function buildIncomesProfessionalExcel(options: {
  records: IncomeRecord[];
  tenantName: string;
  periodLabel?: string;
}): Promise<Buffer> {
  const { records, tenantName, periodLabel } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Woontegra";

  const total = sumAmount(records, (r) => Number(r.tutar));
  const collected = sumWhere(records, (r) => r.tahsilDurumu === "TAHSIL_EDILDI", (r) => Number(r.tutar));
  const pending = sumWhere(records, (r) => r.tahsilDurumu === "BEKLIYOR", (r) => Number(r.tutar));
  const invoiced = countWhere(records, (r) => r.faturaKesildiMi);
  const notInvoiced = records.length - invoiced;

  const ozet = workbook.addWorksheet("Özet");
  let row = addProfessionalHeader(ozet, {
    reportTitle: "Gelirler Raporu",
    tenantName,
    periodLabel,
    recordCount: records.length,
  });
  row = addSectionTitle(ozet, row, "Rapor Özeti", 3);
  addMetricTable(ozet, row, [
    { label: "Toplam Gelir", value: total, money: true },
    { label: "Tahsil Edilen", value: collected, money: true },
    { label: "Bekleyen Tahsilat", value: pending, money: true },
    { label: "Fatura Kesilen", value: invoiced, desc: "Adet" },
    { label: "Fatura Kesilmeyen", value: notInvoiced, desc: "Adet" },
    { label: "Kayıt Sayısı", value: records.length, desc: "Adet" },
  ]);
  setupWorksheetPrint(ozet, ozet.rowCount, 3);

  const detay = workbook.addWorksheet("Gelir Detaylari");
  row = addProfessionalHeader(detay, {
    reportTitle: "Gelir Detayları",
    tenantName,
    periodLabel,
    recordCount: records.length,
  });
  addDetailTable(detay, row, "Gelir Detayları", {
    headers: [
      "Tarih",
      "Proje / Marka",
      "Ürün / Hizmet",
      "Müşteri",
      "Satış Türü",
      "Dönem / Paket",
      "Açıklama",
      "Tutar",
      "Tahsil Durumu",
      "Fatura",
    ],
    widths: [12, 16, 20, 18, 16, 16, 26, 14, 14, 10],
    moneyColumns: [8],
    rows: records.map((r) => [
      formatExcelDate(r.tarih),
      formatExcelText(r.projeMarka),
      formatExcelText(r.urunHizmet),
      formatExcelText(r.musteri),
      r.satisTuru ? INCOME_SALE_TYPE_LABELS[r.satisTuru] ?? r.satisTuru : "—",
      formatExcelText(r.donemPaket),
      formatExcelText(r.aciklama),
      safeMoney(r.tutar),
      INCOME_STATUS_LABELS[r.tahsilDurumu] ?? r.tahsilDurumu,
      formatExcelBoolean(r.faturaKesildiMi),
    ]),
  });
  setupWorksheetPrint(detay, detay.rowCount, 10);

  return workbookToBuffer(workbook);
}

export function incomesExcelFilename(): string {
  return `gelirler-${exportFileDate()}.xlsx`;
}
