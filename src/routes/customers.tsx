import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { useApp } from "@/lib/app-state";
import { AGE_GROUPS, customerEvents, footfall } from "@/lib/demo-data";
import { fmtDay, fmtHour, fmtNum } from "@/lib/format";
import { CHART, DemoTag, EmptyState, PageHeader, Panel, axis, tooltipStyle } from "@/components/kit";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customer Analytics — StoreSight" },
      { name: "description", content: "Footfall trends, anonymous demographic estimates and store comparisons." },
      { property: "og:title", content: "Customer Analytics — StoreSight" },
      { property: "og:description", content: "Footfall trends and anonymous demographic estimates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Customers,
});

const HOUR = 3600_000;

function Customers() {
  const app = useApp();
  const [a, b] = app.bounds;

  const traffic = useMemo(() => {
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

  const scoped = useMemo(() => customerEvents.filter((e) => app.inScope(e.storeId, e.ts)), [app.inScope]);

  const ages = useMemo(() => AGE_GROUPS.map((g) => ({ name: g, count: scoped.filter((e) => e.ageGroup === g).length })), [scoped]);
  const gender = useMemo(() => {
    const m = scoped.filter((e) => e.gender === "Male").length;
    const f = scoped.filter((e) => e.gender === "Female").length;
    const u = scoped.filter((e) => e.gender === "Unavailable").length;
    return [
      { name: "Female", value: f },
      { name: "Male", value: m },
      { name: "Unavailable", value: u },
    ];
  }, [scoped]);

  const byStore = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of footfall) {
      if (!app.storeMatch(f.storeId) || f.ts < a || f.ts > b) continue;
      map.set(f.storeId, (map.get(f.storeId) ?? 0) + f.entries);
    }
    return [...map.entries()]
      .map(([id, entries]) => ({ name: app.stores.find((s) => s.id === id)?.name ?? id, entries }))
      .sort((x, y) => y.entries - x.entries)
      .slice(0, 10);
  }, [a, b, app.storeId, app.storeMatch, app.stores]);

  const lowConfidence = scoped.filter((e) => e.confidence != null && e.confidence < app.settings.minConfidence).length;

  return (
    <div>
      <PageHeader title="Customer Analytics"
        subtitle={<>Anonymous, aggregated estimates only — no faces or identities are stored. <DemoTag /></>} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Foot traffic" desc={app.range === "today" || app.range === "yesterday" ? "Hourly" : "Daily"} className="xl:col-span-2">
          {traffic.length === 0 ? <EmptyState /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={traffic} margin={{ left: -16, right: 8, top: 4 }}>
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

        <Panel title="Gender estimate" desc={`${fmtNum(scoped.length)} anonymous events`}>
          {scoped.length === 0 ? <EmptyState /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={gender} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2}>
                    {gender.map((g, i) => <Cell key={g.name} fill={CHART[i === 0 ? 0 : i === 1 ? 1 : 5]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-1 flex justify-center gap-4 text-xs text-muted-foreground">
                {gender.map((g, i) => (
                  <span key={g.name} className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: CHART[i === 0 ? 0 : i === 1 ? 1 : 5] }} />
                    {g.name} ({fmtNum(g.value)})
                  </span>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Age group estimate" desc="Anonymous distribution; low-confidence samples shown separately">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ages} margin={{ left: -20, right: 8, top: 4 }}>
                <XAxis dataKey="name" {...axis} interval={0} angle={-25} textAnchor="end" height={56} />
                <YAxis {...axis} width={40} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill={CHART[3]} radius={[4, 4, 0, 0]} name="Visitors" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {fmtNum(lowConfidence)} samples below the {Math.round(app.settings.minConfidence * 100)}% confidence threshold are excluded from reporting exports.
          </p>
        </Panel>

        <Panel title="Top stores by entries" desc="Selected range">
          {byStore.length === 0 ? <EmptyState /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStore} layout="vertical" margin={{ left: 8, right: 16, top: 4 }}>
                  <XAxis type="number" {...axis} />
                  <YAxis type="category" dataKey="name" {...axis} width={80} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="entries" fill={CHART[0]} radius={[0, 4, 4, 0]} name="Entries" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
