import { Router, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { tenantMiddleware, getTenantId } from "../../middleware/tenant";
import {
  getCapitalSettings,
  updateCapitalSettings,
  listCapitalIncreases,
  createCapitalIncrease,
  updateCapitalIncrease,
  deleteCapitalIncrease,
  listPartnerCapitalTransactions,
  createPartnerCapitalTransaction,
  updatePartnerCapitalTransaction,
  deletePartnerCapitalTransaction,
  getCapitalSummary,
  listCapitalPartners,
  createCapitalPartner,
  updateCapitalPartner,
  updateCapitalPartnerStatus,
} from "./capital.service";

export const capitalRouter = Router();

capitalRouter.use(authMiddleware, tenantMiddleware);

const viewRoles = requireRole(["SIRKET_SAHIBI", "YONETICI", "PERSONEL", "GORUNTULEYICI"]);
const mutateRoles = requireRole(["SIRKET_SAHIBI", "YONETICI"]);

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
    console.error(err);
    const status = err.message.includes("bulunamadı") ? 404 : 400;
    res.status(status).json({ message: err.message });
    return;
  }
  next(err);
}

capitalRouter.get("/settings", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getCapitalSettings(getTenantId(req));
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

capitalRouter.put("/settings", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await updateCapitalSettings(getTenantId(req), req.body);
    res.json(settings);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

capitalRouter.get("/summary", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await getCapitalSummary(getTenantId(req));
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

capitalRouter.get("/increases", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await listCapitalIncreases(getTenantId(req));
    res.json(items);
  } catch (err) {
    next(err);
  }
});

capitalRouter.post("/increases", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await createCapitalIncrease(getTenantId(req), req.body);
    res.status(201).json(item);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

capitalRouter.patch("/increases/:id", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await updateCapitalIncrease(getTenantId(req), paramId(req), req.body);
    res.json(item);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

capitalRouter.delete("/increases/:id", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteCapitalIncrease(getTenantId(req), paramId(req));
    res.status(204).send();
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

capitalRouter.get("/partners", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await listCapitalPartners(getTenantId(req));
    res.json(items);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

capitalRouter.post("/partners", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await createCapitalPartner(getTenantId(req), req.body);
    res.status(201).json(item);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

capitalRouter.patch("/partners/:id", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await updateCapitalPartner(getTenantId(req), paramId(req), req.body);
    res.json(item);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

capitalRouter.patch(
  "/partners/:id/status",
  mutateRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await updateCapitalPartnerStatus(getTenantId(req), paramId(req), req.body);
      res.json(item);
    } catch (err) {
      handleServiceError(err, res, next);
    }
  }
);

capitalRouter.get("/partner-transactions", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await listPartnerCapitalTransactions(getTenantId(req));
    res.json(items);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

capitalRouter.post("/partner-transactions", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await createPartnerCapitalTransaction(getTenantId(req), req.body);
    res.status(201).json(item);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

capitalRouter.patch(
  "/partner-transactions/:id",
  mutateRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await updatePartnerCapitalTransaction(getTenantId(req), paramId(req), req.body);
      res.json(item);
    } catch (err) {
      handleServiceError(err, res, next);
    }
  }
);

capitalRouter.delete(
  "/partner-transactions/:id",
  mutateRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deletePartnerCapitalTransaction(getTenantId(req), paramId(req));
      res.status(204).send();
    } catch (err) {
      handleServiceError(err, res, next);
    }
  }
);
