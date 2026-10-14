import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ClipboardCheck, ShieldAlert, Users, UserCheck, Truck } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, Cell } from "recharts";
import { useApp } from "@/lib/app-state";
import { footfall, occupancySnapshot } from "@/lib/demo-data";
import { delta, fmtDay, fmtHour, fmtNum, ago } from "@/lib/format";
import { CHART, DemoTag, EmptyState, KpiCard, PageHeader, Panel, StatusBadge, axis, tooltipStyle } from "@/components/kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — StoreSight" },
      { name: "description", content: "Chain-wide retail intelligence: footfall, security alerts, compliance and camera health at a glance." },
      { property: "og:title", content: "Overview — StoreSight" },
      { property: "og:description", content: "Chain-wide retail intelligence at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});

const HOUR = 3600_000;

function Overview() {
  const app = useApp();
  const [a, b] = app.bounds;
  const len = b - a + 1;
  const prev: [number, number] = [a - len, a - 1];

  const scoped = useMemo(() => {
    const inRange = (ts: number, [x, y]: [number, number]) => ts >= x && ts <= y;
    const ff = footfall.filter((f) => app.storeMatch(f.storeId) && inRange(f.ts, app.bounds));
    const ffPrev = footfall.filter((f) => app.storeMatch(f.storeId) && inRange(f.ts, prev));
    const entries = ff.reduce((s, f) => s + f.entries, 0);
    const exits = ff.reduce((s, f) => s + f.exits, 0);
    const entriesPrev = ffPrev.reduce((s, f) => s + f.entries, 0);
    const exitsPrev = ffPrev.reduce((s, f) => s + f.exits, 0);
    const alerts = app.alerts.filter((x) => app.inScope(x.storeId, x.ts));
    const alertsPrev = app.alerts.filter((x) => app.storeMatch(x.storeId) && inRange(x.ts, prev));
    const open = alerts.filter((x) => x.status === "New" || x.status === "Acknowledged" || x.status === "Under Review");
    const emp = app.employeeEvents.filter((e) => app.inScope(e.storeId, e.ts));
    const apron = emp.filter((e) => e.type === "Apron Present" || e.type === "Apron Not Detected");
    const compliance = apron.length ? (apron.filter((e) => e.type === "Apron Present").length / apron.length) * 100 : null;
    const bags = app.bagChecks.filter((x) => app.inScope(x.storeId, x.ts));
    const bagRate = bags.length ? (bags.filter((x) => x.detected).length / bags.length) * 100 : null;
    const deliveries = app.deliveries.filter((d) => app.inScope(d.storeId, d.arrival));
    const cams = app.cameras.filter((c) => app.storeMatch(c.storeId));
    const onlinePct = cams.length ? (cams.filter((c) => c.status === "Online").length / cams.length) * 100 : 0;
    const occupancy = app.storeId === "all"
      ? Object.values(occupancySnapshot).reduce((s, o) => s + o.value, 0)
      : occupancySnapshot[app.storeId]?.value ?? 0;
    return { entries, exits, entriesPrev, exitsPrev, alerts, alertsPrev, open, compliance, bagRate, deliveries, cams, onlinePct, occupancy };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.bounds, app.storeId, app.alerts, app.employeeEvents, app.bagChecks, app.deliveries, app.cameras]);

  const hourly = useMemo(() => {
    const buckets = new Map<number, { ts: number; entries: number; exits: number }>();
    for (const f of footfall) {
      if (!app.storeMatch(f.storeId) || f.ts < a || f.ts > b) continue;
      const key = app.range === "today" || app.range === "yesterday" ? f.ts : Math.floor(f.ts / (24 * HOUR)) * 24 * HOUR;
      const cur = buckets.get(key) ?? { ts: key, entries: 0, exits: 0 };
      cur.entries += f.entries;
      cur.exits += f.exits;
      buckets.set(key, cur);
    }
    return [...buckets.values()].sort((x, y) => x.ts - y.ts);
  }, [a, b, app.range, app.storeId, app.storeMatch]);

  const bySeverity = useMemo(() => {
    const order = ["Critical", "High", "Medium", "Low"] as const;
    return order.map((s) => ({ name: s, count: scoped.alerts.filter((x) => x.severity === s).length }));
  }, [scoped.alerts]);

  const attentionStores = app.stores.filter((s) => s.status === "Attention" && app.storeMatch(s.id));
  const recent = scoped.alerts.slice(0, 8);

  return (
    <div>
      <PageHeader title="Overview" subtitle={<>Chain-wide picture for the selected range. <DemoTag /></>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Entries" value={fmtNum(scoped.entries)} icon={Users} change={delta(scoped.entries, scoped.entriesPrev)} to="/customers" />
        <KpiCard label="Exits" value={fmtNum(scoped.exits)} icon={Users} change={delta(scoped.exits, scoped.exitsPrev)} to="/customers" />
        <KpiCard label="Open alerts" value={scoped.open.length} icon={ShieldAlert} change={delta(scoped.alerts.length, scoped.alertsPrev.length)} invert to="/alerts" tone={scoped.open.some((x) => x.severity === "Critical") ? "critical" : "default"} />
        <KpiCard label="Apron compliance" value={scoped.compliance == null ? "—" : `${scoped.compliance.toFixed(1)}%`} icon={UserCheck} to="/employees" tone="success" hint="of apron checks in range" />
        <KpiCard label="Bag checks verified" value={scoped.bagRate == null ? "—" : `${scoped.bagRate.toFixed(1)}%`} icon={ClipboardCheck} to="/compliance" hint={`${app.bagChecks.filter((x) => app.inScope(x.storeId, x.ts)).length} checks in range`} />
        <KpiCard label="Cameras online" value={`${scoped.onlinePct.toFixed(0)}%`} icon={Camera} to="/stores" tone={scoped.cams.some((c) => c.status === "Offline") ? "warning" : "success"} hint={`${scoped.cams.filter((c) => c.status !== "Online").length} need attention`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Foot traffic" desc={app.range === "today" || app.range === "yesterday" ? "Hourly entries and exits" : "Daily entries and exits"} className="xl:col-span-2">
          {hourly.length === 0 ? <EmptyState /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourly} margin={{ left: -16, right: 8, top: 4 }}>
                  <XAxis dataKey="ts" tickFormatter={app.range === "today" || app.range === "yesterday" ? fmtHour : fmtDay} {...axis} />
                  <YAxis {...axis} width={44} />
                  <Tooltip {...tooltipStyle} labelFormatter={(t) => (app.range === "today" || app.range === "yesterday" ? fmtHour(Number(t)) : fmtDay(Number(t)))} />
                  <Area type="monotone" dataKey="entries" stroke={CHART[0]} fill={CHART[0]} fillOpacity={0.18} strokeWidth={2} name="Entries" />
                  <Area type="monotone" dataKey="exits" stroke={CHART[1]} fill={CHART[1]} fillOpacity={0.12} strokeWidth={2} name="Exits" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Alerts by severity" desc="Selected range">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySeverity} margin={{ left: -24, right: 8, top: 4 }}>
                <XAxis dataKey="name" {...axis} />
                <YAxis {...axis} width={40} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Alerts">
                  {bySeverity.map((s, i) => (
                    <Cell key={s.name} fill={i === 0 ? "var(--destructive)" : i === 1 ? "var(--warning)" : i === 2 ? "var(--info)" : "var(--muted-foreground)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Latest alerts" desc="Most recent across selected stores" className="xl:col-span-2" bodyClass="p-0"
          action={<Link to="/alerts" className="text-xs text-primary">View all</Link>}>
          {recent.length === 0 ? <EmptyState /> : (
            <ul className="divide-y">
              {recent.map((x) => (
                <li key={x.id}>
                  <Link to="/alerts" search={{ id: x.id } as never} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
                    <StatusBadge value={x.severity} dot />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{x.category}</div>
                      <div className="truncate text-xs text-muted-foreground">{app.storeName(x.storeId)} · {ago(x.ts)}</div>
                    </div>
                    <StatusBadge value={x.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Stores needing attention" desc="Flagged stores and offline cameras">
          {attentionStores.length === 0 && scoped.cams.every((c) => c.status === "Online") ? (
            <EmptyState title="All stores nominal" desc="No stores or cameras need attention." icon={Truck} />
          ) : (
            <ul className="space-y-2">
              {attentionStores.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.location}</div>
                  </div>
                  <StatusBadge value={s.status} />
                </li>
              ))}
              {scoped.cams.filter((c) => c.status !== "Online").slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{app.storeName(c.storeId)} · seen {ago(c.lastSeen)}</div>
                  </div>
                  <StatusBadge value={c.status} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">Current occupancy (demo snapshot): {fmtNum(scoped.occupancy)} visitors.</p>
        </Panel>
      </div>
    </div>
  );
}
