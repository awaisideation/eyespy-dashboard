import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/app-state";
import { ago, fmtTime } from "@/lib/format";
import type { AlertCategory, AlertStatus, SecurityAlert, Severity } from "@/lib/types";
import { DemoTag, EmptyState, EvidencePlaceholder, Mono, PageHeader, Panel, Pager, Pick, Row, StatusBadge, td, th, trc, usePaged } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

const CATS: AlertCategory[] = ["Suspicious Activity", "After-Hours Entry", "Unusual Loitering", "Employee Compliance", "Store Inactivity", "Camera Offline", "Other"];
const SEVS: Severity[] = ["Critical", "High", "Medium", "Low"];
const STATUSES: AlertStatus[] = ["New", "Acknowledged", "Under Review", "Resolved", "False Positive"];

export const Route = createFileRoute("/alerts")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s["id"] === "string" ? (s["id"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Security Alerts — StoreSight" },
      { name: "description", content: "Review, acknowledge and resolve AI-detected security alerts across all stores." },
      { property: "og:title", content: "Security Alerts — StoreSight" },
      { property: "og:description", content: "Review and resolve AI-detected security alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Alerts,
});

function Alerts() {
  const app = useApp();
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [sev, setSev] = useState<Severity | "all">("all");
  const [cat, setCat] = useState<AlertCategory | "all">("all");
  const [st, setSt] = useState<AlertStatus | "all">("all");
  const [note, setNote] = useState("");

  const rows = useMemo(() => {
    const q = app.search.toLowerCase();
    return app.alerts.filter((x) =>
      app.inScope(x.storeId, x.ts) &&
      (sev === "all" || x.severity === sev) &&
      (cat === "all" || x.category === cat) &&
      (st === "all" || x.status === st) &&
      (!q || x.id.toLowerCase().includes(q) || x.description.toLowerCase().includes(q) || x.storeId.toLowerCase().includes(q)),
    );
  }, [app.alerts, app.inScope, app.search, sev, cat, st]);

  const pager = usePaged(rows, 14);
  const sel: SecurityAlert | undefined = id ? app.alerts.find((x) => x.id === id) : undefined;
  const open = (x: SecurityAlert) => {
    if (!x.read) app.patchAlert(x.id, { read: true });
    void navigate({ to: "/alerts", search: { id: x.id } as never, replace: true });
  };
  const close = () => void navigate({ to: "/alerts", search: {} as never, replace: true });

  return (
    <div>
      <PageHeader title="Security Alerts" subtitle={<>AI-detected events awaiting review. <DemoTag /></>}
        actions={
          <>
            <Pick<Severity | "all"> label="Severity" value={sev} onChange={setSev} options={[{ value: "all", label: "All severities" }, ...SEVS.map((s) => ({ value: s, label: s }))]} />
            <Pick<AlertCategory | "all"> label="Category" value={cat} onChange={setCat} options={[{ value: "all", label: "All categories" }, ...CATS.map((s) => ({ value: s, label: s }))]} />
            <Pick<AlertStatus | "all"> label="Status" value={st} onChange={setSt} options={[{ value: "all", label: "All statuses" }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
          </>
        }
      />

      <Panel bodyClass="p-0">
        {rows.length === 0 ? <EmptyState /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr>
                  <th className={th}>Alert</th><th className={th}>Severity</th><th className={th}>Store</th><th className={th}>Camera</th><th className={th}>Time</th><th className={th}>Confidence</th><th className={th}>Status</th>
                </tr></thead>
                <tbody>
                  {pager.slice.map((x) => (
                    <tr key={x.id} className={trc} onClick={() => open(x)}>
                      <td className={td}>
                        <div className="flex items-center gap-2">
                          {!x.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                          <div>
                            <div className="font-medium">{x.category}</div>
                            <Mono>{x.id}</Mono>
                          </div>
                        </div>
                      </td>
                      <td className={td}><StatusBadge value={x.severity} dot /></td>
                      <td className={td}>{app.storeName(x.storeId)}</td>
                      <td className={td}>{app.cameraName(x.cameraId)}</td>
                      <td className={td}>{ago(x.ts)}</td>
                      <td className={td}>{x.confidence == null ? "—" : `${Math.round(x.confidence * 100)}%`}</td>
                      <td className={td}><StatusBadge value={x.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager {...pager} />
          </>
        )}
      </Panel>

      <Sheet open={!!sel} onOpenChange={(o) => !o && close()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {sel && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">{sel.category} <StatusBadge value={sel.severity} dot /></SheetTitle>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-6">
                <EvidencePlaceholder available={sel.evidence} />
                <p className="text-sm">{sel.description}</p>
                <div>
                  <Row k="Alert ID"><Mono>{sel.id}</Mono></Row>
                  <Row k="Store">{app.storeName(sel.storeId)}</Row>
                  <Row k="Camera">{app.cameraName(sel.cameraId)}</Row>
                  <Row k="Detected">{fmtTime(sel.ts)}</Row>
                  <Row k="Confidence">{sel.confidence == null ? "—" : `${Math.round(sel.confidence * 100)}%`}</Row>
                  <Row k="Reviewer">{sel.reviewer ?? "Unassigned"}</Row>
                  <Row k="Status"><StatusBadge value={sel.status} /></Row>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sel.status === "New" && <Button size="sm" variant="outline" onClick={() => { app.setAlertStatus(sel.id, "Acknowledged"); toast.success("Alert acknowledged"); }}>Acknowledge</Button>}
                  {(sel.status === "New" || sel.status === "Acknowledged") && <Button size="sm" variant="outline" onClick={() => { app.setAlertStatus(sel.id, "Under Review"); toast.success("Moved to under review"); }}>Start review</Button>}
                  {sel.status !== "Resolved" && <Button size="sm" onClick={() => { app.setAlertStatus(sel.id, "Resolved"); toast.success("Alert resolved"); }}>Resolve</Button>}
                  {sel.status !== "False Positive" && <Button size="sm" variant="ghost" onClick={() => { app.setAlertStatus(sel.id, "False Positive"); toast.success("Marked as false positive"); }}>False positive</Button>}
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Reviewer notes</h3>
                  {sel.notes.length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
                  <ul className="space-y-2">
                    {sel.notes.map((n, i) => (
                      <li key={i} className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                        <div className="mb-0.5 flex justify-between text-muted-foreground"><span>{n.author}</span><span>{fmtTime(n.ts)}</span></div>
                        {n.text}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex gap-2">
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="min-h-16 text-sm" />
                  </div>
                  <Button size="sm" variant="outline" className="mt-2" disabled={!note.trim()}
                    onClick={() => { app.addAlertNote(sel.id, note.trim()); setNote(""); toast.success("Note added"); }}>
                    Add note
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
