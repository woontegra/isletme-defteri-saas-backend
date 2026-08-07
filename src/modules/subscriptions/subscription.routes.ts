import { Router, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { tenantMiddleware, getTenantId } from "../../middleware/tenant";
import {
  listSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from "./subscription.service";

export const subscriptionRouter = Router();

subscriptionRouter.use(authMiddleware, tenantMiddleware);

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

subscriptionRouter.get("/", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await listSubscriptions(getTenantId(req));
    res.json(items);
  } catch (err) {
    next(err);
  }
});

subscriptionRouter.get("/:id", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await getSubscription(getTenantId(req), paramId(req));
    res.json(item);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

subscriptionRouter.post("/", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await createSubscription(getTenantId(req), req.body);
    res.status(201).json(item);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

subscriptionRouter.patch("/:id", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await updateSubscription(getTenantId(req), paramId(req), req.body);
    res.json(item);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

subscriptionRouter.delete("/:id", mutateRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteSubscription(getTenantId(req), paramId(req));
    res.status(204).send();
  } catch (err) {
    handleServiceError(err, res, next);
  }
});
