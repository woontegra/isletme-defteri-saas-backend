import { prisma } from "../../prisma";

export async function getTenantExportMeta(tenantId: string): Promise<{ tenantName: string }> {
  const [tenant, settings] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }),
    prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { firmaUnvani: true },
    }),
  ]);
  const companyName = settings?.firmaUnvani?.trim();
  return { tenantName: companyName || tenant?.name || "İşletme" };
}
