import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";
import { prisma } from "../../prisma";

export const tenantRouter = Router();

tenantRouter.use(authMiddleware, tenantMiddleware);

tenantRouter.get("/current", async (req: Request, res: Response) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.auth!.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
    },
  });

  if (!tenant) {
    res.status(404).json({ message: "İşletme bulunamadı." });
    return;
  }

  res.json(tenant);
});
