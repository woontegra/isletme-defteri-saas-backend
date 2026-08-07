import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../prisma";

export interface AuthContext {
  userId: string;
  tenantId: string;
  rol: UserRole;
  adSoyad: string;
  eposta: string;
  kullaniciAdi: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Oturum açmanız gerekiyor." });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { tenant: true },
    });

    if (!user || !user.aktifMi) {
      res.status(401).json({ message: "Oturum geçersiz veya kullanıcı pasif." });
      return;
    }

    if (user.tenant.status !== "ACTIVE") {
      res.status(403).json({ message: "İşletme hesabı pasif durumda." });
      return;
    }

    if (user.tenantId !== payload.tenantId) {
      res.status(403).json({ message: "Yetkisiz erişim." });
      return;
    }

    req.auth = {
      userId: user.id,
      tenantId: user.tenantId,
      rol: user.rol,
      adSoyad: user.adSoyad,
      eposta: user.eposta,
      kullaniciAdi: user.kullaniciAdi,
    };

    next();
  } catch {
    res.status(401).json({ message: "Oturum süresi dolmuş veya geçersiz." });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ message: "Oturum açmanız gerekiyor." });
      return;
    }

    if (!roles.includes(req.auth.rol)) {
      res.status(403).json({ message: "Bu işlem için yetkiniz yok." });
      return;
    }

    next();
  };
}
