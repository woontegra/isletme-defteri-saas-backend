import ExcelJS from "exceljs";
import type { DebtRecord } from "@prisma/client";
import { DEBT_STATUS_LABELS, DEBT_TYPE_LABELS } from "./export-labels";
import { countWhere, groupBySum, sumAmount, sumWhere } from "./export-analytics";
import {
  addAnalysisTable,
  addDetailTable,
  addMetricTable,
  addProfessionalHeader,
  setupWorksheetPrint,
} from "./excel-report.helpers";
import { exportFileDate, safeMoney } from "./format.utils";
import { formatExcelDate, formatExcelText, workbookToBuffer } from "./excel.styles";

function isUpcomingVade(vadeTarihi: Date | null): boolean {
  if (!vadeTarihi) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 30);
  const vade = new Date(vadeTarihi);
  vade.setHours(0, 0, 0, 0);
  return vade >= today && vade <= limit;
}

export async function buildDebtsProfessionalExcel(options: {
  records: DebtRecord[];
  tenantName: string;
}): Promise<Buffer> {
  const { records, tenantName } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Woontegra";
  const sheet = workbook.addWorksheet("Borc Alacak");

  const openDebt = sumWhere(
    records,
    (r) => r.tur === "BORC" && r.durum === "ACIK",
    (r) => Number(r.tutar)
  );
  const openCredit = sumWhere(
    records,
    (r) => r.tur === "ALACAK" && r.durum === "ACIK",
    (r) => Number(r.tutar)
  );
  const closed = countWhere(records, (r) => r.durum === "KAPANDI");
  const cancelled = countWhere(records, (r) => r.durum === "IPTAL");
  const upcoming = countWhere(records, (r) => r.durum === "ACIK" && isUpcomingVade(r.vadeTarihi));

  let row = addProfessionalHeader(sheet, {
    reportTitle: "Borç / Alacak Raporu",
    tenantName,
    recordCount: records.length,
  });

  row = addMetricTable(sheet, row, [
    { label: "Açık Borç", value: openDebt, money: true },
    { label: "Açık Alacak", value: openCredit, money: true },
    { label: "Net Durum", value: openCredit - openDebt, money: true, net: true },
    { label: "Kapalı Kayıt", value: closed, desc: "Adet" },
    { label: "İptal Kayıt", value: cancelled, desc: "Adet" },
    { label: "Yaklaşan Vade", value: upcoming, desc: "30 gün içinde" },
    { label: "Kayıt Sayısı", value: records.length, desc: "Adet" },
  ]);

  const typeRows = groupBySum(
    records,
    (r) => DEBT_TYPE_LABELS[r.tur] ?? r.tur,
    (r) => Number(r.tutar)
  );
  row = addAnalysisTable(sheet, row, "Tür Özeti", typeRows);

  const statusRows = groupBySum(
    records,
    (r) => DEBT_STATUS_LABELS[r.durum] ?? r.durum,
    (r) => Number(r.tutar)
  );
  row = addAnalysisTable(sheet, row, "Durum Özeti", statusRows);

  const upcomingRecords = records.filter((r) => r.durum === "ACIK" && isUpcomingVade(r.vadeTarihi));
  const upcomingRows = upcomingRecords.map((r) => [
    DEBT_TYPE_LABELS[r.tur] ?? r.tur,
    formatExcelText(r.kisiFirma),
    formatExcelDate(r.vadeTarihi),
    safeMoney(r.tutar),
    DEBT_STATUS_LABELS[r.durum] ?? r.durum,
  ]);
  row = addDetailTable(sheet, row, "Yaklaşan Vadeler (30 Gün)", {
    headers: ["Tür", "Kişi / Firma", "Vade", "Tutar", "Durum"],
    widths: [12, 24, 14, 14, 12],
    moneyColumns: [4],
    rows: upcomingRows,
  });

  row = addDetailTable(sheet, row, "Detay Borç / Alacak Listesi", {
    headers: ["Tür", "Kişi / Firma", "Proje / Marka", "Açıklama", "Tutar", "Vade", "Durum"],
    widths: [12, 22, 16, 28, 14, 12, 12],
    moneyColumns: [5],
    rows: records.map((r) => [
      DEBT_TYPE_LABELS[r.tur] ?? r.tur,
      formatExcelText(r.kisiFirma),
      formatExcelText(r.projeMarka),
      formatExcelText(r.aciklama),
      safeMoney(r.tutar),
      formatExcelDate(r.vadeTarihi),
      DEBT_STATUS_LABELS[r.durum] ?? r.durum,
    ]),
  });

  setupWorksheetPrint(sheet, sheet.rowCount, 7);
  return workbookToBuffer(workbook);
}

export function debtsExcelFilename(): string {
  return `borc-alacak-${exportFileDate()}.xlsx`;
}
