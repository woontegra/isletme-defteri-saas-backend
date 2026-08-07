import ExcelJS from "exceljs";
import type { DebtRecord } from "@prisma/client";
import { DEBT_STATUS_LABELS, DEBT_TYPE_LABELS } from "./export-labels";
import { countWhere, sumWhere } from "./export-analytics";
import {
  addDetailTable,
  addMetricTable,
  addProfessionalHeader,
  addSectionTitle,
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

  const ozet = workbook.addWorksheet("Özet");
  let row = addProfessionalHeader(ozet, {
    reportTitle: "Borç / Alacak Raporu",
    tenantName,
    recordCount: records.length,
  });
  row = addSectionTitle(ozet, row, "Rapor Özeti", 3);
  addMetricTable(ozet, row, [
    { label: "Açık Borç", value: openDebt, money: true },
    { label: "Açık Alacak", value: openCredit, money: true },
    { label: "Net Durum", value: openCredit - openDebt, money: true, net: true },
    { label: "Yaklaşan Vade", value: upcoming, desc: "30 gün içinde" },
    { label: "Kapalı Kayıt", value: closed, desc: "Adet" },
    { label: "İptal Kayıt", value: cancelled, desc: "Adet" },
    { label: "Kayıt Sayısı", value: records.length, desc: "Adet" },
  ]);
  setupWorksheetPrint(ozet, ozet.rowCount, 3);

  const detay = workbook.addWorksheet("Borc Alacak Detaylari");
  row = addProfessionalHeader(detay, {
    reportTitle: "Borç / Alacak Detayları",
    tenantName,
    recordCount: records.length,
  });
  addDetailTable(detay, row, "Borç / Alacak Detayları", {
    headers: ["Tür", "Kişi / Firma", "Açıklama", "Vade", "Tutar", "Durum"],
    widths: [12, 24, 32, 12, 14, 12],
    moneyColumns: [5],
    rows: records.map((r) => [
      DEBT_TYPE_LABELS[r.tur] ?? r.tur,
      formatExcelText(r.kisiFirma),
      formatExcelText(r.aciklama),
      formatExcelDate(r.vadeTarihi),
      safeMoney(r.tutar),
      DEBT_STATUS_LABELS[r.durum] ?? r.durum,
    ]),
  });
  setupWorksheetPrint(detay, detay.rowCount, 6);

  return workbookToBuffer(workbook);
}

export function debtsExcelFilename(): string {
  return `borc-alacak-${exportFileDate()}.xlsx`;
}
