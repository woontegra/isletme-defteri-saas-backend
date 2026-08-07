import type { ReportSummaryDto } from "../reports/report.service";
import {
  BILLING_LABELS,
  DEBT_STATUS_LABELS,
  DEBT_TYPE_LABELS,
  EXPENSE_STATUS_LABELS,
  INCOME_STATUS_LABELS,
  PERIOD_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  WARNING_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "./export-labels";
import {
  formatExportCurrency,
  formatExportDate,
  formatExportDateTime,
  formatExportPercent,
  formatMonthLabel,
  netProjectStatus,
  progressBarText,
  ratioOf,
  safeMoney,
} from "./format.utils";

const BASE_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 20px 24px; font-size: 11px; line-height: 1.45; }
  h1 { color: #fff; font-size: 20px; margin: 0; }
  h2 { font-size: 15px; margin: 0; color: #7dd3fc; border: none; padding: 0; }
  h3 { font-size: 13px; margin: 18px 0 8px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
  .header-band { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); color: #fff; padding: 18px 22px; border-radius: 10px; margin-bottom: 18px; }
  .header-band .meta { color: #cbd5e1; margin-top: 10px; font-size: 10px; }
  .meta { color: #64748b; margin-bottom: 14px; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0 18px; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; background: #f8fafc; border-top: 3px solid #0284c7; }
  .card-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }
  .card-value { font-size: 14px; font-weight: 700; margin-top: 4px; color: #0f172a; }
  .positive { color: #047857; }
  .negative { color: #b91c1c; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { background: #0f172a; color: #fff; text-align: left; padding: 7px 9px; font-size: 9px; text-transform: uppercase; letter-spacing: .03em; }
  td { border-bottom: 1px solid #e2e8f0; padding: 6px 9px; vertical-align: top; word-break: break-word; }
  tr:nth-child(even) td { background: #f8fafc; }
  .money { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .bar { font-family: Consolas, monospace; color: #0284c7; letter-spacing: 1px; }
  .empty { color: #94a3b8; font-style: italic; padding: 12px 0; }
  .footer { margin-top: 20px; color: #94a3b8; font-size: 9px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  .page-break { page-break-before: always; }
`;

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/><title>${title}</title><style>${BASE_STYLES}</style></head><body>${body}<div class="footer">Woontegra İşletme Defteri · ${formatExportDateTime()}</div></body></html>`;
}

function professionalHeaderBlock(title: string, tenantName: string, extra?: string): string {
  return `
    <div class="header-band">
      <h1>Woontegra İşletme Defteri</h1>
      <h2>${title}</h2>
      <div class="meta">
        <div><strong>Şirket:</strong> ${tenantName}</div>
        ${extra ? `<div>${extra}</div>` : ""}
        <div><strong>Oluşturma:</strong> ${formatExportDateTime()}</div>
      </div>
    </div>
  `;
}

function headerBlock(title: string, tenantName: string, extra?: string): string {
  return professionalHeaderBlock(title, tenantName, extra);
}

function tableHtml(headers: string[], rows: string[][], moneyCols: number[] = []): string {
  if (rows.length === 0) {
    return `<div class="empty">Bu dönem için kayıt bulunamadı.</div>`;
  }
  const head = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
  const body = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, idx) => {
            const cls = moneyCols.includes(idx) ? ' class="money"' : "";
            return `<td${cls}>${cell}</td>`;
          })
          .join("")}</tr>`
    )
    .join("");
  return `<table>${head}${body}</table>`;
}

function summaryCards(items: Array<{ label: string; value: string; positive?: boolean; negative?: boolean }>): string {
  return `<div class="cards">${items
    .map(
      (item) => `
      <div class="card">
        <div class="card-label">${item.label}</div>
        <div class="card-value ${item.positive ? "positive" : ""} ${item.negative ? "negative" : ""}">${item.value}</div>
      </div>`
    )
    .join("")}</div>`;
}

export function buildModuleListPdfHtml(options: {
  title: string;
  tenantName: string;
  periodLabel?: string;
  recordCount: number;
  headers: string[];
  rows: string[][];
  moneyColumns?: number[];
}): string {
  const extraParts = [
    options.periodLabel ? `<strong>Dönem:</strong> ${options.periodLabel}` : null,
    `<strong>Kayıt Sayısı:</strong> ${options.recordCount}`,
  ].filter(Boolean);
  const body = `
    ${headerBlock(options.title, options.tenantName, extraParts.join(" · "))}
    ${tableHtml(options.headers, options.rows, options.moneyColumns ?? [])}
  `;
  return wrapHtml(options.title, body);
}

export interface PdfAnalysisSection {
  title: string;
  headers: string[];
  rows: string[][];
  moneyColumns?: number[];
}

export function buildProfessionalModulePdfHtml(options: {
  title: string;
  tenantName: string;
  periodLabel?: string;
  recordCount: number;
  summaryCards: Array<{ label: string; value: string; positive?: boolean; negative?: boolean }>;
  analysisSections: PdfAnalysisSection[];
  detailTitle: string;
  detailHeaders: string[];
  detailRows: string[][];
  detailMoneyColumns?: number[];
}): string {
  const extraParts = [
    options.periodLabel ? `<strong>Dönem:</strong> ${options.periodLabel}` : null,
    `<strong>Kayıt Sayısı:</strong> ${options.recordCount}`,
  ].filter(Boolean);

  const analysisHtml = options.analysisSections
    .map(
      (section) =>
        `<h3>${section.title}</h3>${tableHtml(section.headers, section.rows, section.moneyColumns ?? [])}`
    )
    .join("");

  const body = `
    ${professionalHeaderBlock(options.title, options.tenantName, extraParts.join(" · "))}
    ${summaryCards(options.summaryCards)}
    ${analysisHtml}
    <h3>${options.detailTitle}</h3>
    ${tableHtml(options.detailHeaders, options.detailRows, options.detailMoneyColumns ?? [])}
  `;
  return wrapHtml(options.title, body);
}

export function buildReportsPdfHtml(summary: ReportSummaryDto, tenantName: string): string {
  const period = `${formatExportDate(summary.period.startDate)} - ${formatExportDate(summary.period.endDate)} (${PERIOD_LABELS[summary.period.type] ?? summary.period.type})`;
  const compareTotal = Math.max(summary.genel.toplamGelir, summary.genel.toplamGider, 1);

  const cards = summaryCards([
    { label: "Toplam Gelir", value: formatExportCurrency(summary.genel.toplamGelir), positive: true },
    { label: "Toplam Gider", value: formatExportCurrency(summary.genel.toplamGider), negative: true },
    {
      label: "Net Durum",
      value: formatExportCurrency(summary.genel.netDurum),
      positive: summary.genel.netDurum >= 0,
      negative: summary.genel.netDurum < 0,
    },
    { label: "Bekleyen Tahsilat", value: formatExportCurrency(summary.genel.bekleyenTahsilat) },
    { label: "Bekleyen Ödeme", value: formatExportCurrency(summary.genel.bekleyenGider) },
    {
      label: "Net Borç / Alacak",
      value: formatExportCurrency(summary.borcAlacak.netBorcAlacak),
      positive: summary.borcAlacak.netBorcAlacak >= 0,
      negative: summary.borcAlacak.netBorcAlacak < 0,
    },
  ]);

  const compareRows = [
    ["Gelir", formatExportCurrency(summary.genel.toplamGelir), formatExportPercent(ratioOf(summary.genel.toplamGelir, compareTotal)), progressBarText(ratioOf(summary.genel.toplamGelir, compareTotal))],
    ["Gider", formatExportCurrency(summary.genel.toplamGider), formatExportPercent(ratioOf(summary.genel.toplamGider, compareTotal)), progressBarText(ratioOf(summary.genel.toplamGider, compareTotal))],
    ["Net", formatExportCurrency(summary.genel.netDurum), formatExportPercent(ratioOf(Math.abs(summary.genel.netDurum), compareTotal)), progressBarText(ratioOf(Math.abs(summary.genel.netDurum), compareTotal))],
  ];

  const trendRows = summary.aylikTrend.map((m) => {
    const max = Math.max(...summary.aylikTrend.map((x) => Math.max(x.gelir, x.gider)), 1);
    return [
      formatMonthLabel(m.ay),
      formatExportCurrency(m.gelir),
      formatExportCurrency(m.gider),
      formatExportCurrency(m.net),
      `<span class="bar">${progressBarText(ratioOf(m.gelir, max))}</span>`,
      `<span class="bar">${progressBarText(ratioOf(m.gider, max))}</span>`,
    ];
  });

  const catTotal = summary.giderKategorileri.reduce((s, c) => s + c.toplam, 0);
  const catRows = summary.giderKategorileri.map((c) => [
    c.kategori,
    formatExportCurrency(c.toplam),
    String(c.adet),
    formatExportPercent(ratioOf(c.toplam, catTotal)),
    `<span class="bar">${progressBarText(ratioOf(c.toplam, catTotal))}</span>`,
  ]);

  const projeRows = summary.projeMarkaOzeti.map((p) => [
    p.projeMarka,
    formatExportCurrency(p.gelir),
    formatExportCurrency(p.gider),
    formatExportCurrency(p.net),
    netProjectStatus(p.net),
  ]);

  const pendingSection = (title: string, items: ReportSummaryDto["bekleyenler"]["bekleyenTahsilatlar"]) => {
    const rows = items.map((i) => [
      i.baslik,
      i.altBaslik ?? "—",
      formatExportCurrency(i.tutar),
      formatExportDate(i.tarih),
      i.durum ?? "—",
    ]);
    return `<h3>${title}</h3>${tableHtml(["Başlık", "Alt Bilgi", "Tutar", "Tarih", "Durum"], rows, [2])}`;
  };

  const body = `
    ${headerBlock("Finansal Rapor", tenantName, `<strong>Dönem:</strong> ${period}`)}
    ${cards}
    <h2>Finansal Özet</h2>
    ${tableHtml(
      ["Gösterge", "Değer", "Açıklama"],
      [
        ["Toplam Gelir", formatExportCurrency(summary.genel.toplamGelir), "Dönem gelir toplamı"],
        ["Toplam Gider", formatExportCurrency(summary.genel.toplamGider), "Dönem gider toplamı"],
        ["Net Durum", formatExportCurrency(summary.genel.netDurum), "Gelir - Gider"],
        ["Tahsil Edilen Gelir", formatExportCurrency(summary.genel.tahsilEdilenGelir), ""],
        ["Bekleyen Tahsilat", formatExportCurrency(summary.genel.bekleyenTahsilat), ""],
        ["Ödenen Gider", formatExportCurrency(summary.genel.odenenGider), ""],
        ["Bekleyen Gider", formatExportCurrency(summary.genel.bekleyenGider), ""],
        ["Açık Borç", formatExportCurrency(summary.borcAlacak.acikBorc), ""],
        ["Açık Alacak", formatExportCurrency(summary.borcAlacak.acikAlacak), ""],
        ["Net Borç / Alacak", formatExportCurrency(summary.borcAlacak.netBorcAlacak), ""],
        ["Aktif Abonelik", String(summary.abonelik.aktifAbonelikSayisi), "Adet"],
        ["Yaklaşan Vade", String(summary.borcAlacak.yaklasanVadeSayisi), "30 gün içinde"],
        ["Yaklaşan Yenileme", String(summary.abonelik.yaklasanYenilemeSayisi), "30 gün içinde"],
      ],
      [1]
    )}
    <h2>Gelir / Gider Karşılaştırması</h2>
    ${tableHtml(["Kalem", "Tutar", "Oran", "Bar"], compareRows, [1])}
    <div class="page-break"></div>
    <h2>Aylık Trend</h2>
    ${tableHtml(["Ay", "Gelir", "Gider", "Net", "Gelir Bar", "Gider Bar"], trendRows, [1, 2, 3])}
    <h2>Gider Kategorileri</h2>
    ${tableHtml(["Kategori", "Toplam Gider", "Kayıt", "Oran", "Bar"], catRows, [1])}
    <h2>Proje / Marka Özeti</h2>
    ${tableHtml(["Proje / Marka", "Gelir", "Gider", "Net", "Durum"], projeRows, [1, 2, 3])}
    <div class="page-break"></div>
    <h2>Bekleyenler</h2>
    ${pendingSection("Bekleyen Tahsilatlar", summary.bekleyenler.bekleyenTahsilatlar)}
    ${pendingSection("Bekleyen Giderler", summary.bekleyenler.bekleyenOdemeler)}
    ${pendingSection("Yaklaşan Borç / Alacak Vadeleri", summary.bekleyenler.yaklasanBorcAlacak)}
    ${pendingSection("Yaklaşan Abonelik Yenilemeleri", summary.bekleyenler.yaklasanAbonelikYenilemeleri)}
    <div class="page-break"></div>
    <h2>Borç / Alacak Özeti</h2>
    ${tableHtml(
      ["Gösterge", "Değer", "Açıklama"],
      [
        ["Açık Borç", formatExportCurrency(summary.borcAlacak.acikBorc), ""],
        ["Açık Alacak", formatExportCurrency(summary.borcAlacak.acikAlacak), ""],
        ["Net Borç / Alacak", formatExportCurrency(summary.borcAlacak.netBorcAlacak), ""],
        ["Yaklaşan Vade Sayısı", String(summary.borcAlacak.yaklasanVadeSayisi), "30 gün içinde"],
      ],
      [1]
    )}
    <h2>Abonelik Özeti</h2>
    ${tableHtml(
      ["Gösterge", "Değer", "Açıklama"],
      [
        ["Aktif Abonelik Sayısı", String(summary.abonelik.aktifAbonelikSayisi), ""],
        ["Aylık Abonelik Toplamı", formatExportCurrency(summary.abonelik.aylikAbonelikToplami), ""],
        ["Yıllık Abonelik Toplamı", formatExportCurrency(summary.abonelik.yillikAbonelikToplami), ""],
        ["Yaklaşan Yenileme Sayısı", String(summary.abonelik.yaklasanYenilemeSayisi), "30 gün içinde"],
      ],
      [1]
    )}
    <h2>Sermaye Özeti</h2>
    ${tableHtml(
      ["Gösterge", "Değer", "Açıklama"],
      [
        ["Ana Sermaye", formatExportCurrency(summary.sermaye.anaSermaye), ""],
        ["Ödenen Ana Sermaye", formatExportCurrency(summary.sermaye.toplamAnaSermayeOdemesi), ""],
        ["Kalan Ana Sermaye", formatExportCurrency(summary.sermaye.kalanAnaSermayeOdemesi), ""],
        ["Ana Sermaye Ödeme Oranı", formatExportPercent(summary.sermaye.anaSermayeOdemeOrani), ""],
        ["Ortak Para Limiti", formatExportCurrency(summary.sermaye.ortakParaLimiti), ""],
        ["Net Ortak Alacağı", formatExportCurrency(summary.sermaye.netOrtakAlacagi), ""],
        ["Kalan Ortak Para Limiti", formatExportCurrency(summary.sermaye.kalanLimit), ""],
        ["Ortak Para Kullanım Oranı", formatExportPercent(summary.sermaye.kullanimOrani), ""],
        ["Uyarı Durumu", WARNING_LABELS[summary.sermaye.uyariDurumu] ?? summary.sermaye.uyariDurumu, "Mali müşavirinizle değerlendirmeniz önerilir"],
      ],
      [1]
    )}
  `;

  return wrapHtml("Finansal Rapor", body);
}

export function buildCapitalPdfHtml(options: {
  tenantName: string;
  settings: {
    sirketUnvani: string | null;
    kurulusTarihi: string | null;
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
  increases: Array<{ tarih: string; oncekiSermaye: number | null; yeniSermaye: number; aciklama: string | null }>;
  transactions: Array<{ tarih: string; ortakAdi: string; tur: string; hesap: string | null; aciklama: string | null; tutar: number }>;
}): string {
  const cards = summaryCards([
    { label: "Ana Sermaye", value: formatExportCurrency(options.summary.anaSermaye) },
    { label: "Ödenen Ana Sermaye", value: formatExportCurrency(options.summary.toplamAnaSermayeOdemesi), positive: true },
    { label: "Kalan Ana Sermaye", value: formatExportCurrency(options.summary.kalanAnaSermayeOdemesi) },
    { label: "Ortak Para Limiti", value: formatExportCurrency(options.summary.ortakParaLimiti) },
    { label: "Net Ortak Alacağı", value: formatExportCurrency(options.summary.netOrtakAlacagi) },
    { label: "Uyarı Durumu", value: WARNING_LABELS[options.summary.uyariDurumu] ?? options.summary.uyariDurumu },
  ]);

  const partnerRows = options.partners.map((p) => [
    p.adSoyad,
    p.unvan ?? "—",
    p.telefon ?? "—",
    p.eposta ?? "—",
    p.aktifMi ? "Aktif" : "Pasif",
  ]);

  const increaseRows = options.increases.map((i) => [
    formatExportDate(i.tarih),
    i.oncekiSermaye !== null ? formatExportCurrency(i.oncekiSermaye) : "—",
    formatExportCurrency(i.yeniSermaye),
    i.aciklama ?? "—",
  ]);

  const txRows = options.transactions.map((t) => [
    formatExportDate(t.tarih),
    t.ortakAdi,
    TRANSACTION_TYPE_LABELS[t.tur] ?? t.tur,
    t.hesap ?? "—",
    t.aciklama ?? "—",
    formatExportCurrency(t.tutar),
  ]);

  const body = `
    ${headerBlock("Sermaye / Şirket Bilgileri", options.tenantName)}
    ${cards}
    <h2>Şirket Ayarları</h2>
    ${tableHtml(
      ["Gösterge", "Değer"],
      [
        ["Şirket Ünvanı", options.settings.sirketUnvani ?? "—"],
        ["Kuruluş Tarihi", formatExportDate(options.settings.kurulusTarihi)],
        ["Ana Sermaye", formatExportCurrency(options.settings.anaSermaye)],
        ["Ortak Para Çarpanı", String(options.settings.ortakParaCarpani)],
        ["Uyarı Oranı", formatExportPercent(options.settings.uyariOrani)],
        ["Notlar", options.settings.notlar ?? "—"],
      ],
      [1]
    )}
    <h2>Sermaye Özeti</h2>
    ${tableHtml(
      ["Gösterge", "Değer", "Açıklama"],
      [
        ["Ana Sermaye", formatExportCurrency(options.summary.anaSermaye), ""],
        ["Ödenen Ana Sermaye", formatExportCurrency(options.summary.toplamAnaSermayeOdemesi), "Ana sermaye ödemesi hareketleri"],
        ["Kalan Ana Sermaye", formatExportCurrency(options.summary.kalanAnaSermayeOdemesi), ""],
        ["Ana Sermaye Ödeme Oranı", formatExportPercent(options.summary.anaSermayeOdemeOrani), ""],
        ["Ortak Para Limiti", formatExportCurrency(options.summary.ortakParaLimiti), ""],
        ["Net Ortak Alacağı", formatExportCurrency(options.summary.netOrtakAlacagi), "Para koyma - para çekme"],
        ["Kalan Ortak Para Limiti", formatExportCurrency(options.summary.kalanLimit), ""],
        ["Ortak Para Kullanım Oranı", formatExportPercent(options.summary.kullanimOrani), ""],
        ["Uyarı Durumu", WARNING_LABELS[options.summary.uyariDurumu] ?? options.summary.uyariDurumu, ""],
      ],
      [1]
    )}
    <div class="page-break"></div>
    <h2>Ortaklar</h2>
    ${tableHtml(["Ad Soyad", "Ünvan", "Telefon", "E-posta", "Durum"], partnerRows)}
    <h2>Sermaye Artırım Geçmişi</h2>
    ${tableHtml(["Tarih", "Önceki Sermaye", "Yeni Sermaye", "Açıklama"], increaseRows, [1, 2])}
    <h2>Sermaye ve Ortak Para Hareketleri</h2>
    ${tableHtml(["Tarih", "Ortak", "Tür", "Hesap", "Açıklama", "Tutar"], txRows, [5])}
  `;

  return wrapHtml("Sermaye Raporu", body);
}
