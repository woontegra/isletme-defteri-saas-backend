import { Router, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { parseModulePeriodQuery } from "../../lib/module-period";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { tenantMiddleware, getTenantId } from "../../middleware/tenant";
import {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} from "./expense.service";

export const expenseRouter = Router();

expenseRouter.use(authMiddleware, tenantMiddleware);

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

expenseRouter.get("/", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const periodQuery = parseModulePeriodQuery(req.query as Record<string, unknown>);
    const expenses = await listExpenses(getTenantId(req), periodQuery);
    res.json(expenses);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

expenseRouter.get("/:id", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await getExpense(getTenantId(req), paramId(req));
    res.json(expense);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

expenseRouter.post("/", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await createExpense(getTenantId(req), req.body);
    res.status(201).json(expense);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

expenseRouter.patch("/:id", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await updateExpense(getTenantId(req), paramId(req), req.body);
    res.json(expense);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

expenseRouter.delete("/:id", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteExpense(getTenantId(req), paramId(req));
    res.status(204).send();
  } catch (err) {
    handleServiceError(err, res, next);
  }
});
