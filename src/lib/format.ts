import { NOW } from "./demo-data";
import type { RangeKey } from "./types";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function rangeBounds(range: RangeKey, from?: string, to?: string): [number, number] {
  const today = sod(NOW);
  switch (range) {
    case "today": return [today, NOW];
    case "yesterday": return [today - DAY, today - 1];
    case "7d": return [today - 6 * DAY, NOW];
    case "30d": return [today - 29 * DAY, NOW];
    case "custom": {
      const a = from ? new Date(from + "T00:00").getTime() : today - 6 * DAY;
      const b = to ? new Date(to + "T23:59:59").getTime() : NOW;
      return [a, Math.min(b, NOW)];
    }
  }
}
export function prevBounds([a, b]: [number, number]): [number, number] {
  const len = b - a + 1;
  return [a - len, a - 1];
}
export const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Today", yesterday: "Yesterday", "7d": "Last 7 Days", "30d": "Last 30 Days", custom: "Custom Range",
};

export const fmtTime = (t: number) =>
  new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
export const fmtHour = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
export const fmtDay = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const fmtNum = (n: number) => n.toLocaleString();
export const fmtPct = (n: number | null) => (n == null ? "—" : `${n.toFixed(1)}%`);
export function fmtDur(sec: number | null) {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${Math.round(sec % 60)}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
export function ago(t: number) {
  const m = Math.round((NOW - t) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
export function delta(cur: number, prev: number): number | null {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return false;
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
export const iso = (t: number | null) => (t == null ? "" : new Date(t).toISOString());
