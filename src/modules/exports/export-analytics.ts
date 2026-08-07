import type { AnalysisRow } from "./excel-report.helpers";
import { ratioOf, safeMoney } from "./format.utils";

export function groupBySum<T>(
  items: T[],
  labelFn: (item: T) => string,
  amountFn: (item: T) => number
): AnalysisRow[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const item of items) {
    const label = labelFn(item) || "—";
    const amount = safeMoney(amountFn(item));
    const existing = map.get(label) ?? { total: 0, count: 0 };
    existing.total += amount;
    existing.count += 1;
    map.set(label, existing);
  }
  const grandTotal = [...map.values()].reduce((s, v) => s + v.total, 0);
  return [...map.entries()]
    .map(([label, v]) => ({
      label,
      total: v.total,
      count: v.count,
      ratio: ratioOf(v.total, grandTotal),
    }))
    .sort((a, b) => b.total - a.total);
}

export function sumAmount<T>(items: T[], amountFn: (item: T) => number): number {
  return items.reduce((s, item) => s + safeMoney(amountFn(item)), 0);
}

export function countWhere<T>(items: T[], predicate: (item: T) => boolean): number {
  return items.filter(predicate).length;
}

export function sumWhere<T>(items: T[], predicate: (item: T) => boolean, amountFn: (item: T) => number): number {
  return sumAmount(items.filter(predicate), amountFn);
}

export function maxAmount<T>(items: T[], amountFn: (item: T) => number): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((i) => safeMoney(amountFn(i))));
}

export function averageAmount<T>(items: T[], amountFn: (item: T) => number): number {
  if (items.length === 0) return 0;
  return sumAmount(items, amountFn) / items.length;
}

export function truncateText(value: string | null | undefined, max = 60): string {
  if (!value?.trim()) return "—";
  const t = value.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
