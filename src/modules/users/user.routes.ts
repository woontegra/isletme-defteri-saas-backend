import { Router, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { tenantMiddleware, getTenantId } from "../../middleware/tenant";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  resetUserPassword,
  deactivateUser,
} from "./user.service";

export const userRouter = Router();

userRouter.use(authMiddleware, tenantMiddleware);

const viewRoles = requireRole(["SIRKET_SAHIBI", "YONETICI"]);
const editRoles = requireRole(["SIRKET_SAHIBI", "YONETICI"]);
const manageRoles = requireRole(["SIRKET_SAHIBI"]);

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

userRouter.get("/", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await listUsers(getTenantId(req));
    res.json(users);
  } catch (err) {
    next(err);
  }
});

userRouter.get("/:id", viewRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getUser(getTenantId(req), paramId(req));
    res.json(user);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

userRouter.post("/", manageRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await createUser(getTenantId(req), req.auth!, req.body);
    res.status(201).json(user);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

userRouter.patch("/:id", editRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await updateUser(getTenantId(req), req.auth!, paramId(req), req.body);
    res.json(user);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

userRouter.post(
  "/:id/reset-password",
  manageRoles,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await resetUserPassword(
        getTenantId(req),
        req.auth!,
        paramId(req),
        req.body
      );
      res.json(user);
    } catch (err) {
      handleServiceError(err, res, next);
    }
  }
);

userRouter.delete("/:id", manageRoles, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await deactivateUser(getTenantId(req), req.auth!, paramId(req));
    res.json(user);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});
