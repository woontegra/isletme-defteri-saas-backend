import {
  buildIncomeExpenseWhere,
  getModulePeriodLabelFromQuery,
  parseModulePeriodQuery,
} from "../../lib/module-period";
import { prisma } from "../../prisma";
import { buildDebtsProfessionalExcel, debtsExcelFilename } from "./debts-excel.builder";
import { buildExpensesProfessionalExcel, expensesExcelFilename } from "./expenses-excel.builder";
import { buildIncomesProfessionalExcel, incomesExcelFilename } from "./incomes-excel.builder";
import { buildProfessionalReportsExcel } from "./reports-excel.builder";
import {
  buildSubscriptionsProfessionalExcel,
  subscriptionsExcelFilename,
} from "./subscriptions-excel.builder";
import { buildCapitalExcel } from "./capital-excel.builder";
import { getTenantExportMeta } from "./tenant-meta";

export async function buildIncomesExcel(
  tenantId: string,
  rawQuery: Record<string, unknown>
): Promise<{ buffer: Buffer; filename: string }> {
  const periodQuery = parseModulePeriodQuery(rawQuery);
  const periodLabel = getModulePeriodLabelFromQuery(periodQuery);
  const [records, { tenantName }] = await Promise.all([
    prisma.incomeRecord.findMany({
      where: buildIncomeExpenseWhere(tenantId, periodQuery),
      orderBy: [{ tarih: "desc" }, { createdAt: "desc" }],
    }),
    getTenantExportMeta(tenantId),
  ]);

  const buffer = await buildIncomesProfessionalExcel({ records, tenantName, periodLabel });
  return { buffer, filename: incomesExcelFilename() };
}

export async function buildExpensesExcel(
  tenantId: string,
  rawQuery: Record<string, unknown>
): Promise<{ buffer: Buffer; filename: string }> {
  const periodQuery = parseModulePeriodQuery(rawQuery);
  const periodLabel = getModulePeriodLabelFromQuery(periodQuery);
  const [records, { tenantName }] = await Promise.all([
    prisma.expenseRecord.findMany({
      where: buildIncomeExpenseWhere(tenantId, periodQuery),
      orderBy: [{ tarih: "desc" }, { createdAt: "desc" }],
    }),
    getTenantExportMeta(tenantId),
  ]);

  const buffer = await buildExpensesProfessionalExcel({ records, tenantName, periodLabel });
  return { buffer, filename: expensesExcelFilename() };
}

export async function buildDebtsExcel(tenantId: string): Promise<{ buffer: Buffer; filename: string }> {
  const [records, { tenantName }] = await Promise.all([
    prisma.debtRecord.findMany({
      where: { tenantId },
      orderBy: [{ vadeTarihi: "asc" }, { createdAt: "desc" }],
    }),
    getTenantExportMeta(tenantId),
  ]);

  const buffer = await buildDebtsProfessionalExcel({ records, tenantName });
  return { buffer, filename: debtsExcelFilename() };
}

export async function buildSubscriptionsExcel(
  tenantId: string
): Promise<{ buffer: Buffer; filename: string }> {
  const [records, { tenantName }] = await Promise.all([
    prisma.subscriptionRecord.findMany({
      where: { tenantId },
      orderBy: [{ sonrakiYenilemeTarihi: "asc" }, { createdAt: "desc" }],
    }),
    getTenantExportMeta(tenantId),
  ]);

  const buffer = await buildSubscriptionsProfessionalExcel({ records, tenantName });
  return { buffer, filename: subscriptionsExcelFilename() };
}

export const buildReportsExcel = buildProfessionalReportsExcel;
export { buildCapitalExcel };

export function sendExcelResponse(
  res: { setHeader: (name: string, value: string) => void; send: (body: Buffer) => void },
  buffer: Buffer,
  filename: string
): void {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

export function sendPdfResponse(
  res: { setHeader: (name: string, value: string) => void; send: (body: Buffer) => void },
  buffer: Buffer,
  filename: string
): void {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}
