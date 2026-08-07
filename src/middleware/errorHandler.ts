import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Geçersiz istek verisi.",
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Beklenmeyen bir hata oluştu." });
}
