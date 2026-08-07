import { Router, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { tenantMiddleware, getTenantId } from "../../middleware/tenant";
import { getReportSummary, reportQuerySchema } from "./report.service";

export const reportRouter = Router();

reportRouter.use(authMiddleware, tenantMiddleware);

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

reportRouter.get("/summary", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = reportQuerySchema.parse({
      period: req.query.period,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    const summary = await getReportSummary(getTenantId(req), parsed);
    res.json(summary);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});
