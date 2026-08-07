import { Router, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { tenantMiddleware, getTenantId } from "../../middleware/tenant";
import {
  getCompanySettings,
  updateCompanySettings,
  getAccountSettings,
  updateAccountSettings,
  changePassword,
  getSystemInfo,
} from "./settings.service";
import {
  listCompanyAccounts,
  createCompanyAccount,
  updateCompanyAccount,
  updateCompanyAccountStatus,
} from "./company-account.service";

export const settingsRouter = Router();

settingsRouter.use(authMiddleware, tenantMiddleware);

const allRoles = requireRole(["SIRKET_SAHIBI", "YONETICI", "PERSONEL", "GORUNTULEYICI"]);
const companyEditRoles = requireRole(["SIRKET_SAHIBI", "YONETICI"]);

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

settingsRouter.get("/company", allRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getCompanySettings(getTenantId(req));
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

settingsRouter.put("/company", companyEditRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await updateCompanySettings(getTenantId(req), req.auth!, req.body);
    res.json(settings);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

settingsRouter.get("/account", allRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await getAccountSettings(getTenantId(req), req.auth!.userId);
    res.json(account);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

settingsRouter.put("/account", allRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await updateAccountSettings(getTenantId(req), req.auth!, req.body);
    res.json(account);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

settingsRouter.put("/password", allRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await changePassword(getTenantId(req), req.auth!, req.body);
    res.json({ message: "Şifreniz güncellendi." });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

settingsRouter.get("/system-info", allRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const info = await getSystemInfo(getTenantId(req), req.auth!);
    res.json(info);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

settingsRouter.get("/accounts", allRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await listCompanyAccounts(getTenantId(req));
    res.json(accounts);
  } catch (err) {
    next(err);
  }
});

settingsRouter.post("/accounts", companyEditRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await createCompanyAccount(getTenantId(req), req.body);
    res.status(201).json(account);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

settingsRouter.patch("/accounts/:id", companyEditRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const account = await updateCompanyAccount(getTenantId(req), id, req.body);
    res.json(account);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

settingsRouter.patch("/accounts/:id/status", companyEditRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const account = await updateCompanyAccountStatus(getTenantId(req), id, req.body);
    res.json(account);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});
