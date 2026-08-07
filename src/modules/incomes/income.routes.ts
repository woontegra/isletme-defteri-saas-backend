import { Router, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { parseModulePeriodQuery } from "../../lib/module-period";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { tenantMiddleware, getTenantId } from "../../middleware/tenant";
import {
  listIncomes,
  getIncome,
  createIncome,
  updateIncome,
  deleteIncome,
} from "./income.service";

export const incomeRouter = Router();

incomeRouter.use(authMiddleware, tenantMiddleware);

const viewRoles = requireRole(["SIRKET_SAHIBI", "YONETICI", "PERSONEL", "GORUNTULEYICI"]);
const mutateRoles = requireRole(["SIRKET_SAHIBI", "YONETICI", "PERSONEL"]);

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

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
    const status = err.message.includes("bulunamadı") ? 404 : 400;
    res.status(status).json({ message: err.message });
    return;
  }
  next(err);
}

incomeRouter.get("/", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const periodQuery = parseModulePeriodQuery(req.query as Record<string, unknown>);
    const incomes = await listIncomes(getTenantId(req), periodQuery);
    res.json(incomes);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

incomeRouter.get("/:id", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const income = await getIncome(getTenantId(req), paramId(req));
    res.json(income);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

incomeRouter.post("/", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const income = await createIncome(getTenantId(req), req.body);
    res.status(201).json(income);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

incomeRouter.patch("/:id", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const income = await updateIncome(getTenantId(req), paramId(req), req.body);
    res.json(income);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

incomeRouter.delete("/:id", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteIncome(getTenantId(req), paramId(req));
    res.status(204).send();
  } catch (err) {
    handleServiceError(err, res, next);
  }
});
