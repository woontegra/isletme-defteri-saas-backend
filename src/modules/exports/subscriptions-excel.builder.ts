import ExcelJS from "exceljs";
import type { SubscriptionRecord } from "@prisma/client";
import { BILLING_LABELS, SUBSCRIPTION_STATUS_LABELS } from "./export-labels";
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

function isUpcomingRenewal(date: Date | null): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 30);
  const renewal = new Date(date);
  renewal.setHours(0, 0, 0, 0);
  return renewal >= today && renewal <= limit;
}

export async function buildSubscriptionsProfessionalExcel(options: {
  records: SubscriptionRecord[];
  tenantName: string;
}): Promise<Buffer> {
  const { records, tenantName } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Woontegra";

  const active = countWhere(records, (r) => r.durum === "AKTIF");
  const monthly = sumWhere(records, (r) => r.faturaDonemi === "AYLIK" && r.durum === "AKTIF", (r) => Number(r.tutar));
  const yearly = sumWhere(records, (r) => r.faturaDonemi === "YILLIK" && r.durum === "AKTIF", (r) => Number(r.tutar));
  const upcoming = countWhere(records, (r) => r.durum === "AKTIF" && isUpcomingRenewal(r.sonrakiYenilemeTarihi));
  const paused = countWhere(records, (r) => r.durum === "DURAKLATILDI");
  const cancelled = countWhere(records, (r) => r.durum === "IPTAL");

  const ozet = workbook.addWorksheet("Özet");
  let row = addProfessionalHeader(ozet, {
    reportTitle: "Abonelikler Raporu",
    tenantName,
    recordCount: records.length,
  });
  row = addSectionTitle(ozet, row, "Rapor Özeti", 3);
  addMetricTable(ozet, row, [
    { label: "Aktif Abonelik", value: active, desc: "Adet" },
    { label: "Aylık Toplam", value: monthly, money: true },
    { label: "Yıllık Toplam", value: yearly, money: true },
    { label: "Yaklaşan Yenileme", value: upcoming, desc: "30 gün içinde" },
    { label: "Duraklatılan", value: paused, desc: "Adet" },
    { label: "İptal", value: cancelled, desc: "Adet" },
    { label: "Kayıt Sayısı", value: records.length, desc: "Adet" },
  ]);
  setupWorksheetPrint(ozet, ozet.rowCount, 3);

  const detay = workbook.addWorksheet("Abonelik Detaylari");
  row = addProfessionalHeader(detay, {
    reportTitle: "Abonelik Detayları",
    tenantName,
    recordCount: records.length,
  });
  addDetailTable(detay, row, "Abonelik Detayları", {
    headers: ["Hizmet", "Kategori", "Fatura Dönemi", "Tutar", "Sonraki Yenileme", "Durum", "Not"],
    widths: [22, 16, 14, 14, 14, 12, 24],
    moneyColumns: [4],
    rows: records.map((r) => [
      formatExcelText(r.hizmetAdi),
      formatExcelText(r.kategori),
      BILLING_LABELS[r.faturaDonemi] ?? r.faturaDonemi,
      safeMoney(r.tutar),
      formatExcelDate(r.sonrakiYenilemeTarihi),
      SUBSCRIPTION_STATUS_LABELS[r.durum] ?? r.durum,
      formatExcelText(r.not),
    ]),
  });
  setupWorksheetPrint(detay, detay.rowCount, 7);

  return workbookToBuffer(workbook);
}

export function subscriptionsExcelFilename(): string {
  return `abonelikler-${exportFileDate()}.xlsx`;
}
