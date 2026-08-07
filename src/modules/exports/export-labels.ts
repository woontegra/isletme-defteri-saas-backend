export const INCOME_STATUS_LABELS: Record<string, string> = {
  TAHSIL_EDILDI: "Tahsil Edildi",
  BEKLIYOR: "Bekliyor",
};

export const INCOME_SALE_TYPE_LABELS: Record<string, string> = {
  YAZILIM_ABONELIK: "Yazılım Abonelik",
  YAZILIM_LISANS: "Yazılım Lisans",
  HIZMET: "Hizmet",
  DANISMANLIK: "Danışmanlık",
  EGITIM: "Eğitim",
  DIGER: "Diğer",
};

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  ODENDI: "Ödendi",
  BEKLIYOR: "Bekliyor",
};

export const DEBT_TYPE_LABELS: Record<string, string> = {
  BORC: "Borç",
  ALACAK: "Alacak",
};

export const DEBT_STATUS_LABELS: Record<string, string> = {
  ACIK: "Açık",
  KAPANDI: "Kapandı",
  IPTAL: "İptal",
};

export const BILLING_LABELS: Record<string, string> = {
  AYLIK: "Aylık",
  YILLIK: "Yıllık",
  OZEL: "Özel",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  AKTIF: "Aktif",
  DURAKLATILDI: "Duraklatıldı",
  IPTAL: "İptal",
};

export const WARNING_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  UYARI: "Uyarı",
  LIMIT_ASILDI: "Limit Aşıldı",
  BILGI_GEREKLI: "Sermaye Bilgisi Gerekli",
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  ANA_SERMAYE_ODEMESI: "Ana Sermaye Ödemesi",
  PARA_KOYMA: "Ortak Para Koyma",
  PARA_CEKME: "Para Çekme",
};

export const COMPANY_ACCOUNT_TYPE_LABELS: Record<string, string> = {
  BANKA: "Banka",
  KASA: "Kasa",
  POS: "POS",
  DIGER: "Diğer",
};

export const PERIOD_LABELS: Record<string, string> = {
  THIS_MONTH: "Bu Ay",
  LAST_MONTH: "Geçen Ay",
  LAST_3_MONTHS: "Son 3 Ay",
  LAST_6_MONTHS: "Son 6 Ay",
  THIS_YEAR: "Bu Yıl",
  ALL_TIME: "Tüm Zamanlar",
  CUSTOM: "Özel Tarih",
};

const ALL_LABEL_MAPS: Record<string, Record<string, string>> = {
  income: INCOME_STATUS_LABELS,
  incomeSaleType: INCOME_SALE_TYPE_LABELS,
  expense: EXPENSE_STATUS_LABELS,
  debtType: DEBT_TYPE_LABELS,
  debtStatus: DEBT_STATUS_LABELS,
  billing: BILLING_LABELS,
  subscription: SUBSCRIPTION_STATUS_LABELS,
  warning: WARNING_LABELS,
  transaction: TRANSACTION_TYPE_LABELS,
  companyAccountType: COMPANY_ACCOUNT_TYPE_LABELS,
  period: PERIOD_LABELS,
};

export function formatEnumLabel(
  value: string | null | undefined,
  map: Record<string, string>
): string {
  if (!value) return "—";
  return map[value] ?? value;
}

export function formatEnumLabelAuto(value: string | null | undefined): string {
  if (!value) return "—";
  for (const map of Object.values(ALL_LABEL_MAPS)) {
    if (map[value]) return map[value];
  }
  return value;
}
