import puppeteer from "puppeteer";
import {
  buildIncomeExpenseWhere,
  getModulePeriodLabelFromQuery,
  parseModulePeriodQuery,
} from "../../lib/module-period";
import { prisma } from "../../prisma";
import { getReportSummary, reportQuerySchema } from "../reports/report.service";
import { exportFileDate } from "./format.utils";
import { buildReportsPdfHtml, buildCapitalPdfHtml } from "./pdf-html.builder";
import {
  buildDebtsProfessionalPdfHtml,
  buildExpensesProfessionalPdfHtml,
  buildIncomesProfessionalPdfHtml,
  buildSubscriptionsProfessionalPdfHtml,
} from "./module-pdf.builder";
import { getExportCompanyInfo } from "./tenant-meta";
import {
  getCapitalSettings,
  getCapitalSummary,
  listCapitalIncreases,
  listCapitalPartners,
  listPartnerCapitalTransactions,
} from "../capital/capital.service";
import { listCompanyAccounts } from "../settings/company-account.service";

async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function buildIncomesPdf(
  tenantId: string,
  rawQuery: Record<string, unknown>
): Promise<{ buffer: Buffer; filename: string }> {
  const periodQuery = parseModulePeriodQuery(rawQuery);
  const periodLabel = getModulePeriodLabelFromQuery(periodQuery);
  const [records, company] = await Promise.all([
    prisma.incomeRecord.findMany({
      where: buildIncomeExpenseWhere(tenantId, periodQuery),
      orderBy: [{ tarih: "desc" }],
    }),
    getExportCompanyInfo(tenantId),
  ]);
  const html = buildIncomesProfessionalPdfHtml({ records, company, periodLabel });
  return { buffer: await htmlToPdfBuffer(html), filename: `gelirler-${exportFileDate()}.pdf` };
}

export async function buildExpensesPdf(
  tenantId: string,
  rawQuery: Record<string, unknown>
): Promise<{ buffer: Buffer; filename: string }> {
  const periodQuery = parseModulePeriodQuery(rawQuery);
  const periodLabel = getModulePeriodLabelFromQuery(periodQuery);
  const [records, company] = await Promise.all([
    prisma.expenseRecord.findMany({
      where: buildIncomeExpenseWhere(tenantId, periodQuery),
      orderBy: [{ tarih: "desc" }],
    }),
    getExportCompanyInfo(tenantId),
  ]);
  const html = buildExpensesProfessionalPdfHtml({ records, company, periodLabel });
  return { buffer: await htmlToPdfBuffer(html), filename: `giderler-${exportFileDate()}.pdf` };
}

export async function buildDebtsPdf(tenantId: string): Promise<{ buffer: Buffer; filename: string }> {
  const [records, company] = await Promise.all([
    prisma.debtRecord.findMany({ where: { tenantId }, orderBy: [{ vadeTarihi: "asc" }] }),
    getExportCompanyInfo(tenantId),
  ]);
  const html = buildDebtsProfessionalPdfHtml({ records, company });
  return { buffer: await htmlToPdfBuffer(html), filename: `borc-alacak-${exportFileDate()}.pdf` };
}

export async function buildSubscriptionsPdf(
  tenantId: string
): Promise<{ buffer: Buffer; filename: string }> {
  const [records, company] = await Promise.all([
    prisma.subscriptionRecord.findMany({ where: { tenantId }, orderBy: [{ sonrakiYenilemeTarihi: "asc" }] }),
    getExportCompanyInfo(tenantId),
  ]);
  const html = buildSubscriptionsProfessionalPdfHtml({ records, company });
  return { buffer: await htmlToPdfBuffer(html), filename: `abonelikler-${exportFileDate()}.pdf` };
}

export async function buildReportsPdf(
  tenantId: string,
  query: { period?: string; startDate?: string; endDate?: string }
): Promise<{ buffer: Buffer; filename: string }> {
  const parsed = reportQuerySchema.parse({
    period: query.period ?? "THIS_MONTH",
    startDate: query.startDate,
    endDate: query.endDate,
  });
  const [summary, company] = await Promise.all([
    getReportSummary(tenantId, parsed),
    getExportCompanyInfo(tenantId),
  ]);
  const html = buildReportsPdfHtml(summary, company);
  return { buffer: await htmlToPdfBuffer(html), filename: `raporlar-${exportFileDate()}.pdf` };
}

export async function buildCapitalPdf(tenantId: string): Promise<{ buffer: Buffer; filename: string }> {
  const [settings, summary, increases, partners, transactions, accounts, company] = await Promise.all([
    getCapitalSettings(tenantId),
    getCapitalSummary(tenantId),
    listCapitalIncreases(tenantId),
    listCapitalPartners(tenantId),
    listPartnerCapitalTransactions(tenantId),
    listCompanyAccounts(tenantId),
    getExportCompanyInfo(tenantId),
  ]);

  const html = buildCapitalPdfHtml({
    company,
    settings: {
      sirketUnvani: settings.sirketUnvani,
      kurulusTarihi: settings.kurulusTarihi,
      ticaretSicilGazeteTarihi: settings.ticaretSicilGazeteTarihi,
      anaSermaye: settings.anaSermaye,
      ortakParaCarpani: settings.ortakParaCarpani,
      uyariOrani: settings.uyariOrani,
      notlar: settings.notlar,
    },
    summary,
    partners,
    accounts: accounts.map((a) => ({
      hesapAdi: a.hesapAdi,
      hesapTuru: a.hesapTuru,
      bankaAdi: a.bankaAdi,
      iban: a.iban,
      aktifMi: a.aktifMi,
    })),
    increases,
    transactions: transactions.map((t) => ({
      tarih: t.tarih,
      ortakAdi: t.ortakAdi,
      tur: t.tur,
      hesap: t.companyAccount?.hesapAdi ?? null,
      aciklama: t.aciklama,
      tutar: t.tutar,
    })),
  });

  return { buffer: await htmlToPdfBuffer(html), filename: `sermaye-${exportFileDate()}.pdf` };
}
