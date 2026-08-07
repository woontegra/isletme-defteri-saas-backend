import { prisma } from "../../prisma";

export interface ExportCompanyInfo {
  tenantName: string;
  firmaUnvani: string | null;
  vergiDairesi: string | null;
  vergiNo: string | null;
  telefon: string | null;
  eposta: string | null;
  adres: string | null;
  sehir: string | null;
  ilce: string | null;
}

export async function getTenantExportMeta(tenantId: string): Promise<{ tenantName: string }> {
  const info = await getExportCompanyInfo(tenantId);
  return { tenantName: info.tenantName };
}

export async function getExportCompanyInfo(tenantId: string): Promise<ExportCompanyInfo> {
  const [tenant, settings] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }),
    prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        firmaUnvani: true,
        vergiDairesi: true,
        vergiNo: true,
        telefon: true,
        eposta: true,
        adres: true,
        sehir: true,
        ilce: true,
      },
    }),
  ]);

  const firmaUnvani = settings?.firmaUnvani?.trim() || null;
  const tenantName = firmaUnvani || tenant?.name || "İşletme";

  return {
    tenantName,
    firmaUnvani,
    vergiDairesi: settings?.vergiDairesi?.trim() || null,
    vergiNo: settings?.vergiNo?.trim() || null,
    telefon: settings?.telefon?.trim() || null,
    eposta: settings?.eposta?.trim() || null,
    adres: settings?.adres?.trim() || null,
    sehir: settings?.sehir?.trim() || null,
    ilce: settings?.ilce?.trim() || null,
  };
}
