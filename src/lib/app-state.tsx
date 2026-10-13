import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as demo from "./demo-data";
import { NOW } from "./demo-data";
import { rangeBounds } from "./format";
import type {
  AlertStatus, AuditEvent, BagCheckEvent, Camera, DeliveryEvent, EmployeeMonitoringEvent,
  NotificationRecord, RangeKey, SecurityAlert, Settings, Store, User,
} from "./types";

const KEY = "retail-intel-demo-v1";

const defaultSettings: Settings = {
  orgName: "Demo Retail Group",
  timezone: "Local",
  dateFormat: "MMM d, HH:mm",
  defaultRange: "today",
  inactivityMin: 30,
  idleRegisterSec: 120,
  prolongedSittingMin: 15,
  deliveryThresholdMin: 90,
  minConfidence: 0.6,
  retentionDays: 30,
  quietStart: "23:00",
  quietEnd: "06:00",
  rules: {
    "Critical security events": ["SMS", "Email", "In-app"],
    "After-hours entry": ["SMS", "WhatsApp"],
    "Camera offline": ["Email", "In-app"],
    "Store inactivity": ["In-app"],
    "Employee compliance exceptions": ["In-app"],
    "Delivery processing overdue": ["Email"],
  },
};

interface Data {
  stores: Store[];
  cameras: Camera[];
  alerts: SecurityAlert[];
  employeeEvents: EmployeeMonitoringEvent[];
  deliveries: DeliveryEvent[];
  bagChecks: BagCheckEvent[];
  notifications: NotificationRecord[];
  audit: AuditEvent[];
  settings: Settings;
}
const fresh = (): Data => ({
  stores: demo.stores,
  cameras: demo.cameras,
  alerts: demo.alerts,
  employeeEvents: demo.employeeEvents,
  deliveries: demo.deliveries,
  bagChecks: demo.bagChecks,
  notifications: demo.notifications,
  audit: [],
  settings: defaultSettings,
});

export const currentUser: User = { id: "U1", name: "Demo Owner", email: "owner@example.com", role: "Owner" };

interface Ctx extends Data {
  storeId: string;
  setStoreId: (s: string) => void;
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  custom: { from: string; to: string };
  setCustom: (c: { from: string; to: string }) => void;
  bounds: [number, number];
  inScope: (storeId: string, ts: number) => boolean;
  storeMatch: (storeId: string) => boolean;
  search: string;
  setSearch: (s: string) => void;
  setAlertStatus: (id: string, status: AlertStatus) => void;
  patchAlert: (id: string, p: Partial<SecurityAlert>, action?: string) => void;
  addAlertNote: (id: string, text: string) => void;
  patchEmployee: (id: string, p: Partial<EmployeeMonitoringEvent>, action: string) => void;
  patchBag: (id: string, p: Partial<BagCheckEvent>, action: string) => void;
  patchDelivery: (id: string, p: Partial<DeliveryEvent>, action: string) => void;
  patchStore: (id: string, p: Partial<Store>) => void;
  patchCamera: (id: string, p: Partial<Camera>) => void;
  addNotification: (n: NotificationRecord) => void;
  saveSettings: (s: Settings) => void;
  reset: () => void;
  storeName: (id: string) => string;
  cameraName: (id: string | null) => string;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) return { ...fresh(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return fresh();
  });
  const [storeId, setStoreId] = useState("all");
  const [range, setRange] = useState<RangeKey>(data.settings.defaultRange);
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [search, setSearch] = useState("");

  useEffect(() => {
    const { stores, cameras, alerts, employeeEvents, deliveries, bagChecks, notifications, audit, settings } = data;
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ stores, cameras, alerts, employeeEvents, deliveries, bagChecks, notifications, audit, settings }));
    } catch { /* quota */ }
  }, [data]);

  const bounds = useMemo(() => rangeBounds(range, custom.from, custom.to), [range, custom]);
  const storeMatch = useCallback((s: string) => storeId === "all" || s === storeId, [storeId]);
  const inScope = useCallback((s: string, ts: number) => storeMatch(s) && ts >= bounds[0] && ts <= bounds[1], [storeMatch, bounds]);

  const log = (d: Data, action: string, target: string): AuditEvent[] => [
    { id: `AUD-${d.audit.length + 1}`, ts: Date.now(), actor: currentUser.name, action, target },
    ...d.audit,
  ];

  const value: Ctx = {
    ...data,
    storeId, setStoreId, range, setRange, custom, setCustom, bounds, inScope, storeMatch, search, setSearch,
    setAlertStatus: (id, status) =>
      setData((d) => ({
        ...d,
        alerts: d.alerts.map((a) => (a.id === id ? { ...a, status, read: true, reviewer: a.reviewer ?? currentUser.name } : a)),
        audit: log(d, `Alert status → ${status}`, id),
      })),
    patchAlert: (id, p, action) =>
      setData((d) => ({ ...d, alerts: d.alerts.map((a) => (a.id === id ? { ...a, ...p } : a)), audit: action ? log(d, action, id) : d.audit })),
    addAlertNote: (id, text) =>
      setData((d) => ({
        ...d,
        alerts: d.alerts.map((a) => (a.id === id ? { ...a, notes: [...a.notes, { author: currentUser.name, ts: Date.now(), text }] } : a)),
        audit: log(d, "Reviewer note added", id),
      })),
    patchEmployee: (id, p, action) =>
      setData((d) => ({ ...d, employeeEvents: d.employeeEvents.map((e) => (e.id === id ? { ...e, ...p } : e)), audit: log(d, action, id) })),
    patchBag: (id, p, action) =>
      setData((d) => ({ ...d, bagChecks: d.bagChecks.map((e) => (e.id === id ? { ...e, ...p } : e)), audit: log(d, action, id) })),
    patchDelivery: (id, p, action) =>
      setData((d) => ({ ...d, deliveries: d.deliveries.map((e) => (e.id === id ? { ...e, ...p } : e)), audit: log(d, action, id) })),
    patchStore: (id, p) => setData((d) => ({ ...d, stores: d.stores.map((s) => (s.id === id ? { ...s, ...p } : s)), audit: log(d, "Store metadata edited", id) })),
    patchCamera: (id, p) => setData((d) => ({ ...d, cameras: d.cameras.map((c) => (c.id === id ? { ...c, ...p } : c)), audit: log(d, "Camera metadata edited", id) })),
    addNotification: (n) => setData((d) => ({ ...d, notifications: [n, ...d.notifications], audit: log(d, "Test notification simulated", n.id) })),
    saveSettings: (s) => setData((d) => ({ ...d, settings: s, audit: log(d, "Settings updated", "Settings") })),
    reset: () => {
      sessionStorage.removeItem(KEY);
      setData(fresh());
      setStoreId("all");
      setRange("today");
    },
    storeName: (id) => {
      const s = data.stores.find((x) => x.id === id);
      return s ? `${s.name} · ${s.location}` : id;
    },
    cameraName: (id) => (id ? data.cameras.find((c) => c.id === id)?.name ?? id : "—"),
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}

export { NOW };
