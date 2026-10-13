// Centralized DEMO data generator. Deterministic (seeded) so IDs stay stable
// across reloads. Nothing here represents a real store or real detection.
import type {
  AgeGroup, AlertCategory, AlertStatus, BagCheckEvent, BagCheckStatus, Camera, CameraPosition,
  CameraStatus, Channel, CustomerTrafficEvent, DeliveryEvent, DeliveryState, DetectionModule,
  EmployeeEventType, EmployeeMonitoringEvent, FootfallBucket, NotificationRecord, SecurityAlert,
  Severity, Store,
} from "./types";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(20261013);
const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
const int = (a: number, b: number) => Math.floor(a + r() * (b - a + 1));

const HOUR = 3600_000;
const DAY = 24 * HOUR;
export const NOW = (() => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d.getTime() + 45 * 60_000;
})();
const startOfToday = (() => {
  const d = new Date(NOW);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();
export const DAYS = 30;

const CITIES = [
  "Downtown", "Riverside", "Northgate", "Harbor Point", "Westfield", "Oak Park", "Lakeside",
  "Market Square", "Eastwood", "Hillcrest", "Southbridge", "Maple Grove", "Union Plaza",
  "Cedar Heights", "Bayview", "Old Town", "Parkside", "Greenway", "Summit Mall",
];

export const stores: Store[] = CITIES.map((c, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: `S${n}`,
    name: `Store ${n}`,
    location: c,
    opens: i % 5 === 0 ? "08:00" : "09:00",
    closes: i % 4 === 0 ? "22:00" : "21:00",
    status: i === 6 || i === 13 ? "Attention" : "Open",
    timezone: "Local",
    demo: true,
  };
});

const POS_MODULES: Record<CameraPosition, DetectionModule[]> = {
  Entrance: ["Footfall", "Demographics", "Security"],
  Exit: ["Footfall", "Security", "Bag Check"],
  "Main Hall": ["Security", "Employee"],
  "Checkout Counter": ["Employee", "Security"],
  Stockroom: ["Delivery", "Employee", "Security"],
  "Loading Bay": ["Delivery", "Security"],
};

export const cameras: Camera[] = stores.flatMap((s, i) => {
  const positions: CameraPosition[] =
    i === 0
      ? ["Entrance", "Exit", "Main Hall", "Checkout Counter"]
      : ["Entrance", "Exit", "Main Hall", "Checkout Counter", "Stockroom", ...(i % 3 === 0 ? (["Loading Bay"] as const) : [])];
  return positions.map((p, j) => {
    const roll = r();
    const status: CameraStatus = roll < 0.08 ? "Offline" : roll < 0.16 ? "Degraded" : "Online";
    return {
      id: `${s.id}-C${j + 1}`,
      storeId: s.id,
      name: `${p} Cam`,
      position: p,
      status,
      lastSeen: status === "Offline" ? NOW - int(40, 600) * 60_000 : NOW - int(5, 90) * 1000,
      modules: POS_MODULES[p],
      streamUrl: null,
      bitrateKbps: status === "Offline" ? null : status === "Degraded" ? int(300, 700) : int(1800, 3200),
      demo: true,
    };
  });
});

const camOf = (storeId: string, pos?: CameraPosition) => {
  const list = cameras.filter((c) => c.storeId === storeId && (!pos || c.position === pos));
  return (list[0] ?? cameras.find((c) => c.storeId === storeId)!).id;
};

// Hourly footfall, 30 days x opening hours
const storeScale = stores.map(() => 0.6 + r() * 0.9);
const hourCurve = [0, 0, 0, 0, 0, 0, 0, 0, 0.35, 0.55, 0.7, 0.85, 1, 0.95, 0.8, 0.75, 0.85, 1, 0.95, 0.75, 0.5, 0.3, 0.15, 0];
export const footfall: FootfallBucket[] = [];
for (let d = DAYS - 1; d >= 0; d--) {
  const day0 = startOfToday - d * DAY;
  const dow = new Date(day0).getDay();
  const dowF = dow === 6 ? 1.35 : dow === 0 ? 1.15 : dow === 5 ? 1.15 : 1;
  stores.forEach((s, si) => {
    const open = parseInt(s.opens);
    const close = parseInt(s.closes);
    for (let h = open; h < close; h++) {
      const ts = day0 + h * HOUR;
      if (ts > NOW) continue;
      const base = 38 * storeScale[si] * dowF * hourCurve[h];
      const entries = Math.max(0, Math.round(base * (0.8 + r() * 0.4)));
      const exits = Math.max(0, Math.round(entries * (0.85 + r() * 0.25)));
      footfall.push({ storeId: s.id, ts, entries, exits });
    }
  });
}

// Occupancy snapshot is modeled separately (not entries - exits over a range).
export const occupancySnapshot: Record<string, { value: number; asOf: number; method: string }> = Object.fromEntries(
  stores.map((s, i) => [s.id, { value: Math.round(10 + storeScale[i] * 30 + r() * 12), asOf: NOW - 2 * 60_000, method: "Demo snapshot model" }]),
);

export const AGE_GROUPS: AgeGroup[] = ["Child (0-12)", "Teen (13-17)", "18-24", "25-34", "35-49", "50-64", "65+", "Unavailable"];
const AGE_W = [0.08, 0.07, 0.15, 0.22, 0.21, 0.13, 0.07, 0.07];
const pickAge = (): AgeGroup => {
  let x = r();
  for (let i = 0; i < AGE_W.length; i++) { x -= AGE_W[i]; if (x <= 0) return AGE_GROUPS[i]; }
  return "Unavailable";
};

export const customerEvents: CustomerTrafficEvent[] = Array.from({ length: 900 }, (_, i) => {
  const s = pick(stores);
  const ts = NOW - int(0, 7 * 24 * 60) * 60_000;
  const type = r() < 0.52 ? "Entry" : "Exit";
  const age = pickAge();
  const unavailable = age === "Unavailable";
  const g = r();
  return {
    id: `ANON-${(100000 + i * 37).toString(36).toUpperCase()}`,
    ts,
    storeId: s.id,
    cameraId: camOf(s.id, type === "Entry" ? "Entrance" : "Exit"),
    type,
    ageGroup: age,
    gender: unavailable || g < 0.06 ? "Unavailable" : g < 0.52 ? "Female" : "Male",
    confidence: unavailable ? null : Math.round((0.55 + r() * 0.43) * 100) / 100,
    demo: true,
  };
}).sort((a, b) => b.ts - a.ts);

const REVIEWERS = ["A. Khan", "M. Rivera", "S. Patel", "J. Chen", null];
const ALERT_DEFS: { cat: AlertCategory; sev: Severity[]; pos: CameraPosition; desc: string[] }[] = [
  { cat: "Suspicious Activity", sev: ["Critical", "High"], pos: "Main Hall", desc: ["Possible item concealment near aisle shelving", "Repeated product handling without checkout path", "Person lingered near high-value display and left via exit without checkout"] },
  { cat: "After-Hours Entry", sev: ["Critical", "High"], pos: "Entrance", desc: ["Motion detected at entrance after closing time", "Door activity detected outside operating hours"] },
  { cat: "Unusual Loitering", sev: ["Medium", "Low"], pos: "Entrance", desc: ["Individual stationary near entrance for over 12 minutes", "Group lingering at exit zone"] },
  { cat: "Employee Compliance", sev: ["Medium", "Low"], pos: "Checkout Counter", desc: ["Apron not detected at checkout station", "Register unattended while customers queued"] },
  { cat: "Store Inactivity", sev: ["High", "Medium"], pos: "Main Hall", desc: ["No movement detected during opening hours for 35 minutes"] },
  { cat: "Camera Offline", sev: ["High", "Medium"], pos: "Stockroom", desc: ["Camera stopped reporting heartbeats"] },
  { cat: "Other", sev: ["Low"], pos: "Main Hall", desc: ["Spill or obstruction possibly detected in aisle"] },
];
const ASTATUS: AlertStatus[] = ["New", "New", "New", "Acknowledged", "Under Review", "Resolved", "Resolved", "False Positive"];

export const alerts: SecurityAlert[] = Array.from({ length: 64 }, (_, i) => {
  const def = i < 7 ? ALERT_DEFS[i] : pick(ALERT_DEFS);
  const s = i < 4 ? stores[0] : pick(stores);
  const status = i < 6 ? "New" : pick(ASTATUS);
  const ageMin = i < 10 ? int(3, 600) : int(30, 29 * 24 * 60);
  return {
    id: `ALR-${String(1040 + i * 3).padStart(5, "0")}`,
    ts: NOW - ageMin * 60_000,
    storeId: s.id,
    cameraId: camOf(s.id, def.pos),
    category: def.cat,
    severity: pick(def.sev),
    status,
    description: pick(def.desc),
    confidence: def.cat === "Camera Offline" ? null : Math.round((0.58 + r() * 0.38) * 100) / 100,
    evidence: def.cat !== "Camera Offline" && r() > 0.15,
    reviewer: status === "New" ? null : pick(REVIEWERS),
    read: status !== "New" || r() > 0.6,
    notes: status === "Resolved" ? [{ author: "M. Rivera", ts: NOW - ageMin * 60_000 + 30 * 60_000, text: "Reviewed footage; handled by store manager." }] : [],
    demo: true as const,
  };
}).sort((a, b) => b.ts - a.ts);

const EMP_TYPES: EmployeeEventType[] = ["Apron Present", "Apron Present", "Apron Present", "Apron Not Detected", "Sitting Detected", "Prolonged Sitting", "Idle at Register", "Checkout Activity Detected"];
export const employeeEvents: EmployeeMonitoringEvent[] = Array.from({ length: 420 }, (_, i) => {
  const s = pick(stores);
  const type = pick(EMP_TYPES);
  const dur = type === "Sitting Detected" ? int(60, 600) : type === "Prolonged Sitting" ? int(900, 2400) : type === "Idle at Register" ? int(120, 600) : null;
  return {
    id: `EMP-${String(5000 + i).padStart(5, "0")}`,
    ts: NOW - int(5, 29 * 24 * 60) * 60_000,
    storeId: s.id,
    cameraId: camOf(s.id, type.includes("Register") || type.includes("Checkout") ? "Checkout Counter" : "Main Hall"),
    type,
    employeeRef: r() > 0.3 ? `EMP-REF-${int(100, 199)}` : null,
    durationSec: dur,
    evidence: r() > 0.2,
    confidence: Math.round((0.6 + r() * 0.37) * 100) / 100,
    status: type === "Apron Present" || type === "Checkout Activity Detected" ? "Reviewed" : r() < 0.45 ? "Pending Review" : pick(["Reviewed", "Dismissed"] as const),
    notes: [],
    demo: true as const,
  };
}).sort((a, b) => b.ts - a.ts);

export const deliveries: DeliveryEvent[] = Array.from({ length: 150 }, (_, i) => {
  const s = pick(stores);
  const arrival = NOW - int(20, 29 * 24 * 60) * 60_000;
  const recent = NOW - arrival < 3 * HOUR;
  const startDelay = int(5, 40) * 60_000;
  const dur = int(15, 110) * 60_000;
  const roll = r();
  let status: DeliveryEvent["status"] = "Completed";
  let started: number | null = arrival + startDelay;
  let completed: number | null = started + dur;
  if (recent && roll < 0.5) { status = "Arrival Detected"; started = null; completed = null; }
  else if (recent) { status = "Processing"; completed = null; }
  else if (roll < 0.07) { status = "Needs Review"; completed = null; }
  else if (dur > 90 * 60_000) status = "Overdue";
  return {
    id: `DLV-${String(3000 + i).padStart(5, "0")}`,
    storeId: s.id,
    cameraId: camOf(s.id, "Stockroom"),
    arrival, started, completed, status,
    evidence: r() > 0.25,
    notes: status === "Needs Review" ? "Processing start not detected; verify manually." : "",
    demo: true as const,
  };
}).sort((a, b) => b.arrival - a.arrival);

const BAG: BagCheckStatus[] = ["Verified", "Verified", "Verified", "Verified", "Manually Confirmed", "Not Detected", "Needs Review", "Exception Recorded"];
export const bagChecks: BagCheckEvent[] = Array.from({ length: 360 }, (_, i) => {
  const s = pick(stores);
  const status = pick(BAG);
  return {
    id: `BAG-${String(7000 + i).padStart(5, "0")}`,
    ts: NOW - int(10, 29 * 24 * 60) * 60_000,
    storeId: s.id,
    employeeRef: r() > 0.25 ? `EMP-REF-${int(100, 199)}` : null,
    departure: pick(["End of shift", "Break", "Mid-shift exit"]),
    detected: status === "Verified" || status === "Manually Confirmed",
    status,
    evidence: r() > 0.2,
    notes: [],
    demo: true as const,
  };
}).sort((a, b) => b.ts - a.ts);

const CH: Channel[] = ["SMS", "WhatsApp", "Email", "In-app"];
const DS: DeliveryState[] = ["Delivered", "Delivered", "Sent", "Queued", "Failed", "Unknown"];
const RECIP: Record<Channel, string[]> = {
  SMS: ["+1 ••• ••• 4821", "+1 ••• ••• 1190"],
  WhatsApp: ["+1 ••• ••• 4821", "+44 ••• ••• 3302"],
  Email: ["o•••@example.com", "s•••.ops@example.com"],
  "In-app": ["Owner", "Security Reviewers"],
};
export const notifications: NotificationRecord[] = alerts.slice(0, 50).flatMap((a, i) => {
  const chans = a.severity === "Critical" ? ["SMS", "Email", "In-app"] as Channel[] : [pick(CH)];
  return chans.map((ch, j) => {
    const st = pick(DS);
    return {
      id: `NTF-${String(9000 + i * 4 + j).padStart(5, "0")}`,
      eventId: a.id,
      ts: a.ts + int(5, 60) * 1000,
      storeId: a.storeId,
      channel: ch,
      recipient: pick(RECIP[ch]),
      summary: `${a.severity}: ${a.category} at ${a.storeId}`,
      status: st,
      failure: st === "Failed" ? pick(["Provider timeout", "Invalid recipient", "Rate limited"]) : null,
      simulated: true,
      demo: true as const,
    };
  });
});
