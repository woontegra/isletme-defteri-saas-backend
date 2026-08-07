import { Router, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { tenantMiddleware, getTenantId } from "../../middleware/tenant";
import {
  listDebts,
  getDebt,
  createDebt,
  updateDebt,
  deleteDebt,
} from "./debt.service";

export const debtRouter = Router();

debtRouter.use(authMiddleware, tenantMiddleware);

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

debtRouter.get("/", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debts = await listDebts(getTenantId(req));
    res.json(debts);
  } catch (err) {
    next(err);
  }
});

debtRouter.get("/:id", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debt = await getDebt(getTenantId(req), paramId(req));
    res.json(debt);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

debtRouter.post("/", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debt = await createDebt(getTenantId(req), req.body);
    res.status(201).json(debt);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

debtRouter.patch("/:id", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const debt = await updateDebt(getTenantId(req), paramId(req), req.body);
    res.json(debt);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

debtRouter.delete("/:id", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteDebt(getTenantId(req), paramId(req));
    res.status(204).send();
  } catch (err) {
    handleServiceError(err, res, next);
  }
});
