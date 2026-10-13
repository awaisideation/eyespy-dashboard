// API client abstraction. In demo mode every call resolves from local demo data.
// The endpoints below are PROPOSED contracts for a future Node.js backend —
// they are not implemented. Never put secrets in frontend code.
import type { DashboardSummary, IntegrationState } from "./types";

export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
export const DEMO_MODE = !API_BASE_URL;

export const ENDPOINTS = {
  summary: "/api/dashboard/summary",
  stores: "/api/stores",
  store: (id: string) => `/api/stores/${id}`,
  cameras: "/api/cameras",
  camera: (id: string) => `/api/cameras/${id}`,
  footfall: "/api/analytics/footfall",
  demographics: "/api/analytics/demographics",
  events: "/api/events",
  alerts: "/api/alerts",
  alert: (id: string) => `/api/alerts/${id}`,
  alertStatus: (id: string) => `/api/alerts/${id}/status`,
  alertNotes: (id: string) => `/api/alerts/${id}/notes`,
  employeeEvents: "/api/employee-monitoring/events",
  deliveries: "/api/deliveries",
  bagChecks: "/api/compliance/bag-checks",
  notifications: "/api/notifications",
  reportSummary: "/api/reports/summary",
  integrations: "/api/integrations/status",
} as const;

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function apiRequest<T>(path: string, init?: RequestInit & { query?: Record<string, string | number | undefined> }): Promise<T> {
  if (DEMO_MODE) throw new ApiError(0, "Backend not connected (demo mode)");
  const url = new URL(path, API_BASE_URL);
  Object.entries(init?.query ?? {}).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, String(v)));
  // Auth token (e.g. Firebase ID token) would be attached here by an auth provider.
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return (await res.json()) as T;
}

export type SummaryResponse = DashboardSummary;

export const INTEGRATIONS: { key: string; name: string; desc: string; state: IntegrationState }[] = [
  { key: "backend", name: "Backend API (Node.js)", desc: "Serves events, alerts and reports.", state: DEMO_MODE ? "Not Connected" : "Connected" },
  { key: "firebase", name: "Firebase Auth & Data", desc: "User sign-in and realtime sync.", state: "Not Connected" },
  { key: "sheets", name: "Google Sheets export", desc: "Event exports via the backend.", state: "Not Connected" },
  { key: "sms", name: "SMS / WhatsApp provider", desc: "Outbound alert delivery.", state: "Not Connected" },
  { key: "cameras", name: "Camera ingestion service", desc: "Receives streams and AI detections.", state: "Degraded" },
];
