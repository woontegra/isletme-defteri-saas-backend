import ExcelJS from "exceljs";
import type { ExpenseRecord } from "@prisma/client";
import { EXPENSE_STATUS_LABELS } from "./export-labels";
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

export async function buildExpensesProfessionalExcel(options: {
  records: ExpenseRecord[];
  tenantName: string;
  periodLabel?: string;
}): Promise<Buffer> {
  const { records, tenantName, periodLabel } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Woontegra";

  const total = sumAmount(records, (r) => Number(r.tutar));
  const paid = sumWhere(records, (r) => r.odemeDurumu === "ODENDI", (r) => Number(r.tutar));
  const pending = sumWhere(records, (r) => r.odemeDurumu === "BEKLIYOR", (r) => Number(r.tutar));
  const fisVar = countWhere(records, (r) => r.fisFaturaVarMi);
  const fisYok = records.length - fisVar;

  const ozet = workbook.addWorksheet("Özet");
  let row = addProfessionalHeader(ozet, {
    reportTitle: "Giderler Raporu",
    tenantName,
    periodLabel,
    recordCount: records.length,
  });
  row = addSectionTitle(ozet, row, "Rapor Özeti", 3);
  addMetricTable(ozet, row, [
    { label: "Toplam Gider", value: total, money: true },
    { label: "Ödenen Gider", value: paid, money: true },
    { label: "Bekleyen Gider", value: pending, money: true },
    { label: "Fiş/Fatura Var", value: fisVar, desc: "Adet" },
    { label: "Fiş/Fatura Yok", value: fisYok, desc: "Adet" },
    { label: "Kayıt Sayısı", value: records.length, desc: "Adet" },
  ]);
  setupWorksheetPrint(ozet, ozet.rowCount, 3);

  const detay = workbook.addWorksheet("Gider Detaylari");
  row = addProfessionalHeader(detay, {
    reportTitle: "Gider Detayları",
    tenantName,
    periodLabel,
    recordCount: records.length,
  });
  addDetailTable(detay, row, "Gider Detayları", {
    headers: [
      "Tarih",
      "Kategori",
      "Firma / Tedarikçi",
      "Açıklama",
      "Tutar",
      "Ödeme Durumu",
      "Fiş / Fatura",
    ],
    widths: [12, 18, 20, 32, 14, 14, 12],
    moneyColumns: [5],
    rows: records.map((r) => [
      formatExcelDate(r.tarih),
      formatExcelText(r.kategori),
      formatExcelText(r.firmaTedarikci),
      formatExcelText(r.aciklama),
      safeMoney(r.tutar),
      EXPENSE_STATUS_LABELS[r.odemeDurumu] ?? r.odemeDurumu,
      formatExcelBoolean(r.fisFaturaVarMi),
    ]),
  });
  setupWorksheetPrint(detay, detay.rowCount, 7);

  return workbookToBuffer(workbook);
}

export function expensesExcelFilename(): string {
  return `giderler-${exportFileDate()}.xlsx`;
}
