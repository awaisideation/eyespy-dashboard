import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity, BarChart3, Bell, Camera, ClipboardCheck, FileText, History, LayoutDashboard, LogOut, Menu,
  PanelLeftClose, PanelLeftOpen, RotateCcw, Search, Settings, ShieldAlert, Truck, UserCheck, Users, Video, Wifi, WifiOff,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useApp, currentUser } from "@/lib/app-state";
import { DEMO_MODE } from "@/lib/api";
import { RANGE_LABEL, ago, fmtTime } from "@/lib/format";
import type { RangeKey } from "@/lib/types";
import { Pick, StatusBadge } from "./kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/live", label: "Live Monitoring", icon: Video },
  { to: "/alerts", label: "Security Alerts", icon: ShieldAlert },
  { to: "/customers", label: "Customer Analytics", icon: Users },
  { to: "/employees", label: "Employee Monitoring", icon: UserCheck },
  { to: "/deliveries", label: "Deliveries & Stock", icon: Truck },
  { to: "/compliance", label: "Compliance", icon: ClipboardCheck },
  { to: "/events", label: "Event History", icon: History },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/stores", label: "Stores & Cameras", icon: Camera },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavList({ collapsed, onNav }: { collapsed: boolean; onNav?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { alerts } = useApp();
  const open = alerts.filter((a) => a.status === "New").length;
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {NAV.map((n) => {
        const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
        return (
          <Link key={n.to} to={n.to} onClick={onNav} title={collapsed ? n.label : undefined}
            className={cn("flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0")}>
            <n.icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
            {!collapsed && <span className="flex-1 truncate">{n.label}</span>}
            {!collapsed && n.to === "/alerts" && open > 0 && (
              <span className="rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">{open}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex h-14 items-center gap-2.5 px-4", collapsed && "justify-center px-0")}>
      <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Activity className="size-4" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-sm font-semibold text-sidebar-accent-foreground">StoreSight</div>
          <div className="text-[11px] text-sidebar-muted">Retail Intelligence</div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const app = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const page = NAV.find((n) => (n.to === "/" ? path === "/" : path.startsWith(n.to)))?.label ?? "Page";
  const unread = app.alerts.filter((a) => !a.read && a.status !== "Resolved" && a.status !== "False Positive");

  return (
    <div className="flex min-h-screen w-full">
      <aside className={cn("no-print sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] md:flex", collapsed ? "w-16" : "w-60")}>
        <Brand collapsed={collapsed} />
        <div className="flex-1 overflow-y-auto py-2"><NavList collapsed={collapsed} /></div>
        <div className="border-t border-sidebar-border p-2">
          <button onClick={() => setCollapsed(!collapsed)} className={cn("flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed && "justify-center px-0")}>
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand collapsed={false} />
          <NavList collapsed={false} onNav={() => setMobile(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4">
            <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setMobile(true)} aria-label="Open navigation"><Menu className="size-5" /></Button>
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground">{app.settings.orgName} / {page}</div>
              <div className="truncate text-sm font-semibold">{page}</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden lg:block">
                <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
                <Input value={app.search} onChange={(e) => app.setSearch(e.target.value)} placeholder="Search events, IDs, stores…" className="h-8 w-64 pl-8 text-xs" />
              </div>
              <span className={cn("hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex", DEMO_MODE ? "border-warning/40 bg-warning/10 text-warning-foreground" : "border-success/30 bg-success/10 text-success")}>
                {DEMO_MODE ? <WifiOff className="size-3" /> : <Wifi className="size-3" />}
                {DEMO_MODE ? "Demo Mode · Backend not connected" : "Connected"}
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" className="relative" aria-label="Notifications">
                    <Bell className="size-4" />
                    {unread.length > 0 && <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">{unread.length}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <span className="text-sm font-semibold">Unread alerts</span>
                    {unread.length > 0 && <button className="text-xs text-primary" onClick={() => unread.forEach((a) => app.patchAlert(a.id, { read: true }))}>Mark all read</button>}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {unread.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">You're all caught up.</p>}
                    {unread.slice(0, 8).map((a) => (
                      <Link key={a.id} to="/alerts" search={{ id: a.id } as never} className="block border-b px-3 py-2 hover:bg-muted/50">
                        <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{a.category}</span><StatusBadge value={a.severity} /></div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{a.storeId} · {ago(a.ts)}</div>
                      </Link>
                    ))}
                  </div>
                  <Link to="/notifications" className="block border-t px-3 py-2 text-center text-xs text-primary">Notification history</Link>
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-label="Account">DO</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-sm">{currentUser.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">{currentUser.email} · {currentUser.role}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/settings">Account & settings</Link></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { app.reset(); toast.success("Demo data reset", { description: "All simulated changes were cleared." }); }}>
                    <RotateCcw className="size-4" /> Reset demo data
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toast.info("Sign-out unavailable in demo mode", { description: "Authentication connects once Firebase is configured." })}>
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t bg-background/60 px-4 py-2">
            <Pick label="Store" value={app.storeId} onChange={app.setStoreId}
              options={[{ value: "all", label: "All Stores (19)" }, ...app.stores.map((s) => ({ value: s.id, label: `${s.name} · ${s.location}` }))]} className="min-w-[180px]" />
            <Pick<RangeKey> label="Date range" value={app.range} onChange={app.setRange}
              options={(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => ({ value: k, label: RANGE_LABEL[k] }))} />
            {app.range === "custom" && (
              <div className="flex items-center gap-1.5 text-xs">
                <Input type="date" className="h-8 w-36 text-xs" value={app.custom.from} onChange={(e) => app.setCustom({ ...app.custom, from: e.target.value })} aria-label="From" />
                <span className="text-muted-foreground">to</span>
                <Input type="date" className="h-8 w-36 text-xs" value={app.custom.to} onChange={(e) => app.setCustom({ ...app.custom, to: e.target.value })} aria-label="To" />
              </div>
            )}
            <span className="ml-auto text-[11px] text-muted-foreground">
              {fmtTime(app.bounds[0])} – {fmtTime(app.bounds[1])} · All values simulated
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
