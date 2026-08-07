import type { ReportSummaryDto } from "../reports/report.service";
import {
  BILLING_LABELS,
  COMPANY_ACCOUNT_TYPE_LABELS,
  PERIOD_LABELS,
  TRANSACTION_TYPE_LABELS,
  WARNING_LABELS,
} from "./export-labels";
import {
  formatExportCurrency,
  formatExportDate,
  formatExportPercent,
  formatMonthLabel,
  safeMoney,
} from "./format.utils";
import {
  buildCompanyInfoSection,
  buildDataTable,
  buildKvTable,
  buildLetterhead,
  buildSectionTitle,
  buildSummaryTable,
  buildTotalsBox,
  moneyCell,
  wrapOfficialPdf,
} from "./official-pdf.builder";
import {
  buildPdfTable,
  CAPITAL_MOVEMENT_COLUMNS,
  CAPITAL_MOVEMENT_PDF_STYLES,
  PDF_TABLE_STYLES,
  safeCellText,
} from "./pdf-table.builder";
import type { ExportCompanyInfo } from "./tenant-meta";

function wrapReportsPdf(title: string, body: string): string {
  return wrapOfficialPdf(title, body).replace("<style>", `<style>${PDF_TABLE_STYLES}`);
}

function wrapCapitalPdf(title: string, body: string): string {
  return wrapOfficialPdf(title, body).replace(
    "<style>",
    `<style>${PDF_TABLE_STYLES}${CAPITAL_MOVEMENT_PDF_STYLES}`
  );
}

export function buildReportsPdfHtml(summary: ReportSummaryDto, company: ExportCompanyInfo): string {
  const period = `${formatExportDate(summary.period.startDate)} - ${formatExportDate(summary.period.endDate)} (${PERIOD_LABELS[summary.period.type] ?? summary.period.type})`;

  const financialSummary: Array<[string, string]> = [
    ["Toplam Gelir", moneyCell(summary.genel.toplamGelir)],
    ["Toplam Gider", moneyCell(summary.genel.toplamGider)],
    ["Net Durum", moneyCell(summary.genel.netDurum)],
    ["Tahsil Edilen Gelir", moneyCell(summary.genel.tahsilEdilenGelir)],
    ["Bekleyen Tahsilat", moneyCell(summary.genel.bekleyenTahsilat)],
    ["Ödenen Gider", moneyCell(summary.genel.odenenGider)],
    ["Bekleyen Gider", moneyCell(summary.genel.bekleyenGider)],
  ];

  const incomeExpenseRows = summary.aylikTrend.map((m) => [
    safeCellText(formatMonthLabel(m.ay)),
    moneyCell(m.gelir),
    moneyCell(m.gider),
    moneyCell(m.net),
  ]);

  const categoryRows = summary.giderKategorileri.map((c) => [
    safeCellText(c.kategori),
    moneyCell(c.toplam),
    String(c.adet),
  ]);

  const debtSummary: Array<[string, string]> = [
    ["Açık Borç", moneyCell(summary.borcAlacak.acikBorc)],
    ["Açık Alacak", moneyCell(summary.borcAlacak.acikAlacak)],
    ["Net Borç / Alacak", moneyCell(summary.borcAlacak.netBorcAlacak)],
    ["Yaklaşan Vade Sayısı", String(summary.borcAlacak.yaklasanVadeSayisi)],
  ];

  const subscriptionSummary: Array<[string, string]> = [
    ["Aktif Abonelik Sayısı", String(summary.abonelik.aktifAbonelikSayisi)],
    ["Aylık Abonelik Toplamı", moneyCell(summary.abonelik.aylikAbonelikToplami)],
    ["Yıllık Abonelik Toplamı", moneyCell(summary.abonelik.yillikAbonelikToplami)],
    ["Yaklaşan Yenileme Sayısı", String(summary.abonelik.yaklasanYenilemeSayisi)],
  ];

  const capitalSummary: Array<[string, string]> = [
    ["Ana Sermaye", moneyCell(summary.sermaye.anaSermaye)],
    ["Ödenen Ana Sermaye", moneyCell(summary.sermaye.toplamAnaSermayeOdemesi)],
    ["Kalan Ana Sermaye", moneyCell(summary.sermaye.kalanAnaSermayeOdemesi)],
    ["Ana Sermaye Ödeme Oranı", safeCellText(formatExportPercent(summary.sermaye.anaSermayeOdemeOrani))],
    ["Ortak Para Limiti", moneyCell(summary.sermaye.ortakParaLimiti)],
    ["Net Ortak Alacağı", moneyCell(summary.sermaye.netOrtakAlacagi)],
    ["Kalan Ortak Para Limiti", moneyCell(summary.sermaye.kalanLimit)],
    ["Ortak Para Kullanım Oranı", safeCellText(formatExportPercent(summary.sermaye.kullanimOrani))],
    ["Uyarı Durumu", safeCellText(WARNING_LABELS[summary.sermaye.uyariDurumu] ?? summary.sermaye.uyariDurumu)],
  ];

  const pendingRows = (items: ReportSummaryDto["bekleyenler"]["bekleyenTahsilatlar"]) =>
    items.map((i) => [
      safeCellText(i.baslik),
      safeCellText(i.altBaslik),
      moneyCell(i.tutar),
      safeCellText(formatExportDate(i.tarih)),
      safeCellText(i.durum),
    ]);

  const body = `
    ${buildLetterhead(company, "FİNANSAL RAPOR", period)}
    ${buildCompanyInfoSection(company)}
    ${buildSummaryTable(financialSummary)}
    ${buildDataTable("GELİR / GİDER ÖZETİ", ["Ay", "Gelir", "Gider", "Net"], incomeExpenseRows, { moneyCols: [1, 2, 3] })}
    ${buildSummaryTable(debtSummary)}
    ${buildSummaryTable(subscriptionSummary)}
    ${buildSummaryTable(capitalSummary)}
    ${buildDataTable("GİDER KATEGORİLERİ", ["Kategori", "Toplam", "Kayıt"], categoryRows, { moneyCols: [1] })}
    ${buildDataTable("BEKLEYEN TAHSİLATLAR", ["Başlık", "Alt Bilgi", "Tutar", "Tarih", "Durum"], pendingRows(summary.bekleyenler.bekleyenTahsilatlar), { moneyCols: [2] })}
    ${buildDataTable("BEKLEYEN GİDERLER", ["Başlık", "Alt Bilgi", "Tutar", "Tarih", "Durum"], pendingRows(summary.bekleyenler.bekleyenOdemeler), { moneyCols: [2] })}
    ${buildDataTable("YAKLAŞAN BORÇ / ALACAK VADELERİ", ["Başlık", "Alt Bilgi", "Tutar", "Tarih", "Durum"], pendingRows(summary.bekleyenler.yaklasanBorcAlacak), { moneyCols: [2] })}
    ${buildDataTable("YAKLAŞAN ABONELİK YENİLEMELERİ", ["Başlık", "Alt Bilgi", "Tutar", "Tarih", "Durum"], pendingRows(summary.bekleyenler.yaklasanAbonelikYenilemeleri), { moneyCols: [2] })}
    ${buildSectionTitle("SONUÇ")}
    ${buildTotalsBox([
      ["Net Durum", moneyCell(summary.genel.netDurum)],
      ["Net Borç / Alacak", moneyCell(summary.borcAlacak.netBorcAlacak)],
      ["Bekleyen Tahsilat", moneyCell(summary.genel.bekleyenTahsilat)],
      ["Bekleyen Gider", moneyCell(summary.genel.bekleyenGider)],
    ])}
  `;

  return wrapReportsPdf("Finansal Rapor", body);
}

export function buildCapitalPdfHtml(options: {
  company: ExportCompanyInfo;
  settings: {
    sirketUnvani: string | null;
    kurulusTarihi: string | null;
    ticaretSicilGazeteTarihi?: string | null;
    anaSermaye: number;
    ortakParaCarpani: number;
    uyariOrani: number;
    notlar: string | null;
  };
  summary: {
    anaSermaye: number;
    toplamAnaSermayeOdemesi: number;
    kalanAnaSermayeOdemesi: number;
    anaSermayeOdemeOrani: number;
    ortakParaLimiti: number;
    netOrtakAlacagi: number;
    kalanLimit: number;
    kullanimOrani: number;
    uyariDurumu: string;
  };
  partners: Array<{ adSoyad: string; unvan: string | null; telefon: string | null; eposta: string | null; aktifMi: boolean }>;
  accounts: Array<{ hesapAdi: string; hesapTuru: string; bankaAdi: string | null; iban: string | null; aktifMi: boolean }>;
  increases: Array<{ tarih: string; oncekiSermaye: number | null; yeniSermaye: number; aciklama: string | null }>;
  transactions: Array<{ tarih: string; ortakAdi: string; tur: string; hesap: string | null; aciklama: string | null; tutar: number }>;
}): string {
  const companyInfoRows: Array<[string, string]> = [
    ["Şirket Ünvanı", safeCellText(options.settings.sirketUnvani ?? options.company.tenantName)],
    ["Kuruluş Tarihi", safeCellText(formatExportDate(options.settings.kurulusTarihi))],
    ["Ticaret Sicil Gazetesi Yayın Tarihi", safeCellText(formatExportDate(options.settings.ticaretSicilGazeteTarihi ?? null))],
    ["Ana Sermaye", moneyCell(options.settings.anaSermaye)],
    ["Ortak Para Çarpanı", safeCellText(String(options.settings.ortakParaCarpani))],
    ["Uyarı Oranı", safeCellText(formatExportPercent(options.settings.uyariOrani))],
    ["Notlar", safeCellText(options.settings.notlar)],
  ];

  const capitalSummaryRows: Array<[string, string]> = [
    ["Ana Sermaye", moneyCell(options.summary.anaSermaye)],
    ["Ödenen Ana Sermaye", moneyCell(options.summary.toplamAnaSermayeOdemesi)],
    ["Kalan Ana Sermaye", moneyCell(options.summary.kalanAnaSermayeOdemesi)],
    ["Ana Sermaye Ödeme Oranı", safeCellText(formatExportPercent(options.summary.anaSermayeOdemeOrani))],
    ["Ortak Para Limiti", moneyCell(options.summary.ortakParaLimiti)],
    ["Net Ortak Alacağı", moneyCell(options.summary.netOrtakAlacagi)],
    ["Kalan Ortak Para Limiti", moneyCell(options.summary.kalanLimit)],
    ["Ortak Para Kullanım Oranı", safeCellText(formatExportPercent(options.summary.kullanimOrani))],
    ["Uyarı Durumu", safeCellText(WARNING_LABELS[options.summary.uyariDurumu] ?? options.summary.uyariDurumu)],
  ];

  const partnerRows = options.partners.map((p) => [
    safeCellText(p.adSoyad),
    safeCellText(p.unvan),
    safeCellText(p.telefon),
    safeCellText(p.eposta),
    p.aktifMi ? "Aktif" : "Pasif",
  ]);

  const accountRows = options.accounts.map((a) => [
    safeCellText(a.hesapAdi),
    safeCellText(COMPANY_ACCOUNT_TYPE_LABELS[a.hesapTuru] ?? a.hesapTuru),
    safeCellText(a.bankaAdi),
    safeCellText(a.iban),
    a.aktifMi ? "Aktif" : "Pasif",
  ]);

  const txRows = options.transactions.map((t) => [
    safeCellText(formatExportDate(t.tarih)),
    safeCellText(t.ortakAdi),
    safeCellText(TRANSACTION_TYPE_LABELS[t.tur] ?? t.tur),
    safeCellText(t.hesap),
    safeCellText(t.aciklama),
    moneyCell(t.tutar),
  ]);

  const increaseRows = options.increases.map((i) => [
    safeCellText(formatExportDate(i.tarih)),
    i.oncekiSermaye !== null ? moneyCell(i.oncekiSermaye) : "—",
    moneyCell(i.yeniSermaye),
    safeCellText(i.aciklama),
  ]);

  const body = `
    ${buildLetterhead(options.company, "SERMAYE / ŞİRKET BİLGİLERİ RAPORU")}
    ${buildSectionTitle("ŞİRKET BİLGİLERİ")}
    ${buildKvTable(companyInfoRows)}
    ${buildSummaryTable(capitalSummaryRows)}
    ${buildDataTable("ORTAKLAR", ["Ad Soyad", "Ünvan", "Telefon", "E-posta", "Durum"], partnerRows)}
    ${buildDataTable("BANKA / KASA HESAPLARI", ["Hesap Adı", "Hesap Türü", "Banka Adı", "IBAN", "Durum"], accountRows)}
    ${buildSectionTitle("SERMAYE VE ORTAK PARA HAREKETLERİ")}
    ${buildPdfTable(CAPITAL_MOVEMENT_COLUMNS, txRows, {
      emptyText: "Henüz sermaye hareketi bulunmuyor.",
      tableClass: "capital-movements-table",
    })}
    ${buildDataTable("SERMAYE ARTIRIMLARI", ["Tarih", "Önceki Sermaye", "Yeni Sermaye", "Açıklama"], increaseRows, { moneyCols: [1, 2] })}
    ${buildSectionTitle("SONUÇ")}
    ${buildTotalsBox([
      ["Ana Sermaye Bakiyesi", moneyCell(options.summary.anaSermaye)],
      ["Net Ortak Alacağı", moneyCell(options.summary.netOrtakAlacagi)],
      ["Kalan Ortak Para Limiti", moneyCell(options.summary.kalanLimit)],
    ])}
  `;

  return wrapCapitalPdf("Sermaye Raporu", body);
}
