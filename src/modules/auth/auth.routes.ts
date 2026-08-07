import { Router, Request, Response, NextFunction } from "express";
import { login, getMe } from "./auth.service";
import { authMiddleware } from "../../middleware/auth";

export const authRouter = Router();

authRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eposta = req.body.eposta ?? req.body.email;
    const sifre = req.body.sifre ?? req.body.password;
    const result = await login(eposta, sifre);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message) {
      res.status(401).json({ message: err.message });
      return;
    }
    next(err);
  }
});

authRouter.get("/me", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getMe(req.auth!.userId);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message) {
      res.status(401).json({ message: err.message });
      return;
    }
    next(err);
  }
});
