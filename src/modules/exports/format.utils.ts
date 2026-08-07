export function formatExportCurrency(value: unknown): string {
  const amount = Number(value);
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatExportDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatExportDateTime(value: Date = new Date()): string {
  return value.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatExportPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("tr-TR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(safe);
}

export function safeMoney(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export const safeNumber = safeMoney;

export function progressBarText(ratio: number, width = 10): string {
  const safe = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const filled = Math.round(safe * width);
  return `${"█".repeat(filled)}${"░".repeat(Math.max(0, width - filled))}`;
}

export function ratioOf(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return part / total;
}

export function netProjectStatus(net: number): string {
  if (net > 0) return "Kârlı";
  if (net < 0) return "Zararda";
  return "Dengede";
}

export function formatMonthLabel(ay: string): string {
  const [year, month] = ay.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

export function exportFileDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
