import ExcelJS from "exceljs";
import type { SubscriptionRecord } from "@prisma/client";
import { BILLING_LABELS, SUBSCRIPTION_STATUS_LABELS } from "./export-labels";
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
  const sheet = workbook.addWorksheet("Abonelikler");

  const active = countWhere(records, (r) => r.durum === "AKTIF");
  const monthly = sumWhere(records, (r) => r.faturaDonemi === "AYLIK" && r.durum === "AKTIF", (r) => Number(r.tutar));
  const yearly = sumWhere(records, (r) => r.faturaDonemi === "YILLIK" && r.durum === "AKTIF", (r) => Number(r.tutar));
  const upcoming = countWhere(records, (r) => r.durum === "AKTIF" && isUpcomingRenewal(r.sonrakiYenilemeTarihi));
  const paused = countWhere(records, (r) => r.durum === "DURAKLATILDI");
  const cancelled = countWhere(records, (r) => r.durum === "IPTAL");

  let row = addProfessionalHeader(sheet, {
    reportTitle: "Abonelikler Raporu",
    tenantName,
    recordCount: records.length,
  });

  row = addMetricTable(sheet, row, [
    { label: "Aktif Abonelik", value: active, desc: "Adet" },
    { label: "Aylık Toplam", value: monthly, money: true, desc: "Aktif aylık abonelikler" },
    { label: "Yıllık Toplam", value: yearly, money: true, desc: "Aktif yıllık abonelikler" },
    { label: "Yaklaşan Yenileme", value: upcoming, desc: "30 gün içinde" },
    { label: "Duraklatılan", value: paused, desc: "Adet" },
    { label: "İptal", value: cancelled, desc: "Adet" },
    { label: "Kayıt Sayısı", value: records.length, desc: "Adet" },
  ]);

  const billingRows = groupBySum(
    records,
    (r) => BILLING_LABELS[r.faturaDonemi] ?? r.faturaDonemi,
    (r) => Number(r.tutar)
  );
  row = addAnalysisTable(sheet, row, "Fatura Dönemi Özeti", billingRows);

  const statusRows = groupBySum(
    records,
    (r) => SUBSCRIPTION_STATUS_LABELS[r.durum] ?? r.durum,
    (r) => Number(r.tutar)
  );
  row = addAnalysisTable(sheet, row, "Durum Özeti", statusRows);

  const upcomingRecords = records.filter((r) => r.durum === "AKTIF" && isUpcomingRenewal(r.sonrakiYenilemeTarihi));
  row = addDetailTable(sheet, row, "Yaklaşan Yenilemeler (30 Gün)", {
    headers: ["Hizmet", "Kategori", "Dönem", "Tutar", "Yenileme", "Durum"],
    widths: [22, 16, 12, 14, 14, 12],
    moneyColumns: [4],
    rows: upcomingRecords.map((r) => [
      formatExcelText(r.hizmetAdi),
      formatExcelText(r.kategori),
      BILLING_LABELS[r.faturaDonemi] ?? r.faturaDonemi,
      safeMoney(r.tutar),
      formatExcelDate(r.sonrakiYenilemeTarihi),
      SUBSCRIPTION_STATUS_LABELS[r.durum] ?? r.durum,
    ]),
  });

  row = addDetailTable(sheet, row, "Detay Abonelik Listesi", {
    headers: ["Hizmet", "Kategori", "Proje", "Dönem", "Tutar", "Yenileme", "Durum", "Not"],
    widths: [22, 16, 14, 12, 14, 14, 12, 24],
    moneyColumns: [5],
    rows: records.map((r) => [
      formatExcelText(r.hizmetAdi),
      formatExcelText(r.kategori),
      formatExcelText(r.projeMarka),
      BILLING_LABELS[r.faturaDonemi] ?? r.faturaDonemi,
      safeMoney(r.tutar),
      formatExcelDate(r.sonrakiYenilemeTarihi),
      SUBSCRIPTION_STATUS_LABELS[r.durum] ?? r.durum,
      formatExcelText(r.not),
    ]),
  });

  setupWorksheetPrint(sheet, sheet.rowCount, 8);
  return workbookToBuffer(workbook);
}

export function subscriptionsExcelFilename(): string {
  return `abonelikler-${exportFileDate()}.xlsx`;
}
