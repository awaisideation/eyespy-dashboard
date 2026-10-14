import { createFileRoute } from "@tanstack/react-router";
import { Video, VideoOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-state";
import { ago } from "@/lib/format";
import type { CameraStatus } from "@/lib/types";
import { DemoTag, EmptyState, PageHeader, Panel, Pick, StatusBadge, usePaged, Pager } from "@/components/kit";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Monitoring — StoreSight" },
      { name: "description", content: "Live camera grid across all stores with stream health and AI detection modules." },
      { property: "og:title", content: "Live Monitoring — StoreSight" },
      { property: "og:description", content: "Live camera grid across all stores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Live,
});

function Live() {
  const app = useApp();
  const [status, setStatus] = useState<CameraStatus | "all">("all");

  const cams = useMemo(
    () => app.cameras.filter((c) => app.storeMatch(c.storeId) && (status === "all" || c.status === status)),
    [app.cameras, app.storeMatch, status],
  );
  const pager = usePaged(cams, 12);
  const offline = app.cameras.filter((c) => app.storeMatch(c.storeId) && c.status === "Offline").length;

  return (
    <div>
      <PageHeader
        title="Live Monitoring"
        subtitle={<>Camera grid with simulated streams. <DemoTag /></>}
        actions={
          <Pick<CameraStatus | "all"> label="Status" value={status} onChange={setStatus}
            options={[{ value: "all", label: "All statuses" }, { value: "Online", label: "Online" }, { value: "Degraded", label: "Degraded" }, { value: "Offline", label: "Offline" }]} />
        }
      />

      {offline > 0 && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {offline} camera{offline > 1 ? "s" : ""} offline in the selected scope. Security coverage is reduced.
        </div>
      )}

      <Panel title={`${cams.length} cameras`} desc="Streams are placeholders in demo mode — no real footage is shown." bodyClass="p-0">
        {cams.length === 0 ? <EmptyState /> : (
          <>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pager.slice.map((c) => (
                <div key={c.id} className="overflow-hidden rounded-lg border bg-card">
                  <div className="relative flex aspect-video items-center justify-center bg-sidebar">
                    {c.status === "Offline" ? (
                      <div className="flex flex-col items-center gap-1.5 text-sidebar-muted">
                        <VideoOff className="size-6" />
                        <span className="text-[11px]">No signal — last seen {ago(c.lastSeen)}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-sidebar-muted">
                        <Video className="size-6" />
                        <span className="text-[11px]">Simulated stream · {c.bitrateKbps} kbps</span>
                      </div>
                    )}
                    <span className="absolute left-2 top-2"><StatusBadge value={c.status} dot /></span>
                    {c.status !== "Offline" && (
                      <span className="absolute right-2 top-2 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">LIVE</span>
                    )}
                  </div>
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      <span className="text-[11px] text-muted-foreground">{c.position}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{app.storeName(c.storeId)}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.modules.map((m) => (
                        <span key={m} className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pager {...pager} />
          </>
        )}
      </Panel>
    </div>
  );
}
