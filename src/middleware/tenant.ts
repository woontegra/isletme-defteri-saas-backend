import { Request, Response, NextFunction } from "express";

/**
 * Tenant izolasyonu için req.auth.tenantId kullanılır.
 */
export function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.auth?.tenantId) {
    res.status(401).json({ message: "Tenant bilgisi bulunamadı." });
    return;
  }

  next();
}

export function getTenantId(req: Request): string {
  if (!req.auth?.tenantId) {
    throw new Error("Tenant bilgisi bulunamadı.");
  }
  return req.auth.tenantId;
}
