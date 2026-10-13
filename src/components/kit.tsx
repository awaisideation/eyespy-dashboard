import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, ImageOff, Inbox, ShieldAlert, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const CHART = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)", "var(--success)", "var(--border)"];
export const tooltipStyle = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" },
  labelStyle: { color: "var(--muted-foreground)" },
};
export const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, desc, action, children, className, bodyClass }: { title?: string; desc?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card shadow-card", className)}>
      {title && (
        <header className="flex items-start justify-between gap-2 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-4", bodyClass)}>{children}</div>
    </section>
  );
}

export function KpiCard({ label, value, icon: Icon, change, hint, to, search, tone = "default", invert }: {
  label: string; value: ReactNode; icon: LucideIcon; change?: number | null; hint?: string;
  to?: string; search?: Record<string, string>; tone?: "default" | "warning" | "critical" | "success"; invert?: boolean;
}) {
  const good = change == null ? null : invert ? change <= 0 : change >= 0;
  const body = (
    <div className="flex h-full flex-col rounded-lg border bg-card p-4 shadow-card transition-colors group-hover:border-primary/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex size-7 items-center justify-center rounded-md",
          tone === "critical" ? "bg-destructive/10 text-destructive" : tone === "warning" ? "bg-warning/15 text-warning-foreground" : tone === "success" ? "bg-success/10 text-success" : "bg-accent text-accent-foreground")}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular tracking-tight">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        {change != null && (
          <span className={cn("inline-flex items-center font-medium", good ? "text-success" : "text-destructive")}>
            {change >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        <span className="text-muted-foreground">{hint ?? (change != null ? "vs previous period" : "No comparison available")}</span>
      </div>
    </div>
  );
  if (!to) return body;
  return <Link to={to} search={search as never} className="group block">{body}</Link>;
}

type Tone = "neutral" | "info" | "success" | "warning" | "critical" | "primary";
const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-info/10 text-info border-info/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  primary: "bg-accent text-accent-foreground border-primary/20",
};
const STATUS_TONE: Record<string, Tone> = {
  Critical: "critical", High: "warning", Medium: "info", Low: "neutral",
  New: "critical", Acknowledged: "warning", "Under Review": "info", Resolved: "success", "False Positive": "neutral",
  Online: "success", Offline: "critical", Degraded: "warning",
  Open: "success", Closed: "neutral", Attention: "warning",
  "Pending Review": "warning", Reviewed: "success", Dismissed: "neutral",
  "Arrival Detected": "info", Processing: "primary", Completed: "success", Overdue: "critical", "Needs Review": "warning",
  Verified: "success", "Manually Confirmed": "success", "Not Detected": "warning", "Exception Recorded": "neutral",
  Queued: "neutral", Sent: "info", Delivered: "success", Failed: "critical", Unknown: "neutral",
  Connected: "success", "Not Connected": "neutral", Error: "critical",
  "Apron Present": "success", "Apron Not Detected": "warning", "Sitting Detected": "info", "Prolonged Sitting": "warning",
  "Idle at Register": "warning", "Checkout Activity Detected": "success", Entry: "primary", Exit: "neutral",
};
export function StatusBadge({ value, tone, dot }: { value: string; tone?: Tone; dot?: boolean }) {
  const t = tone ?? STATUS_TONE[value] ?? "neutral";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium", TONE[t])}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {value}
    </span>
  );
}

export function DemoTag({ children = "Demo data" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-foreground">{children}</span>;
}

export function EmptyState({ title = "No matching records", desc = "Try a different store, date range or filter.", icon: Icon = Inbox }: { title?: string; desc?: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="size-8 text-muted-foreground/60" />
      <p className="mt-2 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

export function EvidencePlaceholder({ available, label = "Evidence" }: { available: boolean; label?: string }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/60 text-center">
      {available ? <ShieldAlert className="size-6 text-muted-foreground" /> : <ImageOff className="size-6 text-muted-foreground" />}
      <p className="text-xs font-medium">{available ? `${label} placeholder — restricted content` : "No evidence captured"}</p>
      <p className="max-w-xs text-[11px] text-muted-foreground">
        {available ? "Demo mode: real evidence images load from the secured backend for authorized reviewers only." : "This event has no stored evidence."}
      </p>
    </div>
  );
}

export function Pick<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] | readonly T[]; label?: string; className?: string }) {
  const opts = (options as (T | { value: T; label: string })[]).map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className={cn("h-8 w-auto min-w-[130px] bg-card text-xs", className)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opts.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function usePaged<T>(rows: T[], size = 12) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(page, pages - 1);
  const slice = useMemo(() => rows.slice(p * size, p * size + size), [rows, p, size]);
  return { slice, page: p, pages, setPage, total: rows.length, size };
}
export function Pager({ page, pages, setPage, total, size }: { page: number; pages: number; setPage: (n: number) => void; total: number; size: number }) {
  if (!total) return null;
  return (
    <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
      <span>{page * size + 1}–{Math.min(total, (page + 1) * size)} of {total}</span>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="size-7" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
        <span className="px-1">Page {page + 1} / {pages}</span>
        <Button size="icon" variant="ghost" className="size-7" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
      </div>
    </div>
  );
}

export function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] text-muted-foreground">{children}</span>;
}

export const th = "h-9 px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";
export const td = "px-3 py-2.5 text-sm align-middle whitespace-nowrap";
export const trc = "border-t hover:bg-muted/50 cursor-pointer";
