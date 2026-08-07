import ExcelJS from "exceljs";
import type { ExpenseRecord } from "@prisma/client";
import { EXPENSE_STATUS_LABELS } from "./export-labels";
import {
  averageAmount,
  countWhere,
  groupBySum,
  maxAmount,
  sumAmount,
  sumWhere,
} from "./export-analytics";
import {
  addAnalysisTable,
  addDetailTable,
  addMetricTable,
  addProfessionalHeader,
  setupWorksheetPrint,
} from "./excel-report.helpers";
import { exportFileDate, safeMoney } from "./format.utils";
import {
  formatExcelBoolean,
  formatExcelDate,
  formatExcelText,
  workbookToBuffer,
} from "./excel.styles";

export async function buildExpensesProfessionalExcel(options: {
  records: ExpenseRecord[];
  tenantName: string;
  periodLabel?: string;
}): Promise<Buffer> {
  const { records, tenantName, periodLabel } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Woontegra";
  const sheet = workbook.addWorksheet("Giderler");

  const total = sumAmount(records, (r) => Number(r.tutar));
  const paid = sumWhere(records, (r) => r.odemeDurumu === "ODENDI", (r) => Number(r.tutar));
  const pending = sumWhere(records, (r) => r.odemeDurumu === "BEKLIYOR", (r) => Number(r.tutar));
  const fisVar = sumWhere(records, (r) => r.fisFaturaVarMi, (r) => Number(r.tutar));
  const fisYok = sumWhere(records, (r) => !r.fisFaturaVarMi, (r) => Number(r.tutar));
  const avg = averageAmount(records, (r) => Number(r.tutar));
  const max = maxAmount(records, (r) => Number(r.tutar));

  let row = addProfessionalHeader(sheet, {
    reportTitle: "Giderler Raporu",
    tenantName,
    periodLabel,
    recordCount: records.length,
  });

  row = addMetricTable(sheet, row, [
    { label: "Toplam Gider", value: total, money: true, desc: "Dönem toplamı" },
    { label: "Ödenen Gider", value: paid, money: true, desc: "Ödeme durumu: Ödendi" },
    { label: "Bekleyen Gider", value: pending, money: true, desc: "Ödeme durumu: Bekliyor" },
    { label: "Fiş/Fatura Var", value: fisVar, money: true, desc: `${countWhere(records, (r) => r.fisFaturaVarMi)} kayıt` },
    { label: "Fiş/Fatura Yok", value: fisYok, money: true, desc: `${countWhere(records, (r) => !r.fisFaturaVarMi)} kayıt` },
    { label: "Ortalama Gider", value: avg, money: true },
    { label: "En Yüksek Gider", value: max, money: true },
    { label: "Kayıt Sayısı", value: records.length, desc: "Adet" },
  ]);

  const categoryRows = groupBySum(records, (r) => r.kategori, (r) => Number(r.tutar));
  row = addAnalysisTable(sheet, row, "Kategori Özeti", categoryRows);

  const paymentRows = groupBySum(
    records,
    (r) => EXPENSE_STATUS_LABELS[r.odemeDurumu] ?? r.odemeDurumu,
    (r) => Number(r.tutar)
  );
  row = addAnalysisTable(sheet, row, "Ödeme Durumu Özeti", paymentRows);

  const fisRows = groupBySum(
    records,
    (r) => (r.fisFaturaVarMi ? "Var" : "Yok"),
    (r) => Number(r.tutar)
  );
  row = addAnalysisTable(sheet, row, "Fiş / Fatura Özeti", fisRows);

  row = addDetailTable(sheet, row, "Detay Gider Listesi", {
    headers: [
      "Tarih",
      "Vade Tarihi",
      "Kategori",
      "Proje / Marka",
      "Firma / Tedarikçi",
      "Açıklama",
      "Tutar",
      "KDV Oranı",
      "KDV Dahil",
      "Ödeme Durumu",
      "Fiş / Fatura",
    ],
    widths: [12, 12, 20, 16, 18, 28, 14, 10, 10, 14, 12],
    moneyColumns: [7],
    rows: records.map((r) => [
      formatExcelDate(r.tarih),
      formatExcelDate(r.vadeTarihi),
      formatExcelText(r.kategori),
      formatExcelText(r.projeMarka),
      formatExcelText(r.firmaTedarikci),
      formatExcelText(r.aciklama),
      safeMoney(r.tutar),
      r.kdvOrani !== null ? safeMoney(r.kdvOrani) : "—",
      formatExcelBoolean(r.kdvDahilMi),
      EXPENSE_STATUS_LABELS[r.odemeDurumu] ?? r.odemeDurumu,
      formatExcelBoolean(r.fisFaturaVarMi),
    ]),
  });

  setupWorksheetPrint(sheet, sheet.rowCount, 11);
  return workbookToBuffer(workbook);
}

export function expensesExcelFilename(): string {
  return `giderler-${exportFileDate()}.xlsx`;
}
