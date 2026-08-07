import { Router, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { tenantMiddleware, getTenantId } from "../../middleware/tenant";
import {
  buildIncomesExcel,
  buildExpensesExcel,
  buildDebtsExcel,
  buildSubscriptionsExcel,
  buildReportsExcel,
  buildCapitalExcel,
  sendExcelResponse,
  sendPdfResponse,
} from "./export.service";
import {
  buildIncomesPdf,
  buildExpensesPdf,
  buildDebtsPdf,
  buildSubscriptionsPdf,
  buildReportsPdf,
  buildCapitalPdf,
} from "./pdf.service";

export const exportRouter = Router();

exportRouter.use(authMiddleware, tenantMiddleware);

const viewRoles = requireRole(["SIRKET_SAHIBI", "YONETICI", "PERSONEL", "GORUNTULEYICI"]);

function handleServiceError(
  err: unknown,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof ZodError) {
    const first = err.errors[0]?.message ?? "Geçersiz istek verisi.";
    res.status(400).json({ message: first });
    return;
  }
  if (err instanceof Error && err.message) {
    res.status(400).json({ message: err.message });
    return;
  }
  next(err);
}

exportRouter.get("/incomes.xlsx", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename } = await buildIncomesExcel(getTenantId(req), req.query as Record<string, unknown>);
    sendExcelResponse(res, buffer, filename);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

exportRouter.get("/expenses.xlsx", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename } = await buildExpensesExcel(getTenantId(req), req.query as Record<string, unknown>);
    sendExcelResponse(res, buffer, filename);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

exportRouter.get("/debts.xlsx", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename } = await buildDebtsExcel(getTenantId(req));
    sendExcelResponse(res, buffer, filename);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

exportRouter.get(
  "/subscriptions.xlsx",
  viewRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { buffer, filename } = await buildSubscriptionsExcel(getTenantId(req));
      sendExcelResponse(res, buffer, filename);
    } catch (err) {
      handleServiceError(err, res, next);
    }
  }
);

exportRouter.get("/reports.xlsx", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename } = await buildReportsExcel(getTenantId(req), {
      period: req.query.period as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    sendExcelResponse(res, buffer, filename);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

exportRouter.get("/incomes.pdf", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename } = await buildIncomesPdf(getTenantId(req), req.query as Record<string, unknown>);
    sendPdfResponse(res, buffer, filename);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

exportRouter.get("/expenses.pdf", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename } = await buildExpensesPdf(getTenantId(req), req.query as Record<string, unknown>);
    sendPdfResponse(res, buffer, filename);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

exportRouter.get("/debts.pdf", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename } = await buildDebtsPdf(getTenantId(req));
    sendPdfResponse(res, buffer, filename);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

exportRouter.get(
  "/subscriptions.pdf",
  viewRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { buffer, filename } = await buildSubscriptionsPdf(getTenantId(req));
      sendPdfResponse(res, buffer, filename);
    } catch (err) {
      handleServiceError(err, res, next);
    }
  }
);

exportRouter.get("/reports.pdf", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename } = await buildReportsPdf(getTenantId(req), {
      period: req.query.period as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    sendPdfResponse(res, buffer, filename);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

exportRouter.get("/capital.xlsx", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename } = await buildCapitalExcel(getTenantId(req));
    sendExcelResponse(res, buffer, filename);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

exportRouter.get("/capital.pdf", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename } = await buildCapitalPdf(getTenantId(req));
    sendPdfResponse(res, buffer, filename);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});
