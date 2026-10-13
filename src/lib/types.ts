// Typed domain models. All demo records carry `demo: true`.
export type Severity = "Critical" | "High" | "Medium" | "Low";
export type AlertStatus = "New" | "Acknowledged" | "Under Review" | "Resolved" | "False Positive";
export type CameraStatus = "Online" | "Offline" | "Degraded";
export type CameraPosition = "Entrance" | "Exit" | "Main Hall" | "Checkout Counter" | "Stockroom" | "Loading Bay";
export type DetectionModule = "Footfall" | "Demographics" | "Security" | "Employee" | "Delivery" | "Bag Check";
export type ReviewStatus = "Pending Review" | "Reviewed" | "Dismissed";
export type IntegrationState = "Not Connected" | "Connected" | "Degraded" | "Error";

export interface Store {
  id: string;
  name: string;
  location: string;
  opens: string;
  closes: string;
  status: "Open" | "Closed" | "Attention";
  timezone: string;
  demo: true;
}

export interface Camera {
  id: string;
  storeId: string;
  name: string;
  position: CameraPosition;
  status: CameraStatus;
  lastSeen: number;
  modules: DetectionModule[];
  streamUrl: string | null;
  bitrateKbps: number | null;
  demo: true;
}

export interface FootfallBucket {
  storeId: string;
  ts: number; // hour start
  entries: number;
  exits: number;
}

export interface DemographicEstimate {
  ageGroups: Record<AgeGroup, number>;
  gender: { Male: number; Female: number; Unavailable: number };
}
export type AgeGroup = "Child (0-12)" | "Teen (13-17)" | "18-24" | "25-34" | "35-49" | "50-64" | "65+" | "Unavailable";

export interface CustomerTrafficEvent {
  id: string; // anonymous tracking id
  ts: number;
  storeId: string;
  cameraId: string;
  type: "Entry" | "Exit";
  ageGroup: AgeGroup;
  gender: "Male" | "Female" | "Unavailable";
  confidence: number | null;
  demo: true;
}

export interface Note {
  author: string;
  ts: number;
  text: string;
}

export interface SecurityAlert {
  id: string;
  ts: number;
  storeId: string;
  cameraId: string;
  category: AlertCategory;
  severity: Severity;
  status: AlertStatus;
  description: string;
  confidence: number | null;
  evidence: boolean;
  reviewer: string | null;
  read: boolean;
  notes: Note[];
  demo: true;
}
export type AlertCategory =
  | "Suspicious Activity"
  | "After-Hours Entry"
  | "Unusual Loitering"
  | "Employee Compliance"
  | "Store Inactivity"
  | "Camera Offline"
  | "Other";

export type EmployeeEventType =
  | "Apron Present"
  | "Apron Not Detected"
  | "Sitting Detected"
  | "Prolonged Sitting"
  | "Idle at Register"
  | "Checkout Activity Detected";

export interface EmployeeMonitoringEvent {
  id: string;
  ts: number;
  storeId: string;
  cameraId: string;
  type: EmployeeEventType;
  employeeRef: string | null;
  durationSec: number | null;
  evidence: boolean;
  confidence: number;
  status: ReviewStatus;
  notes: Note[];
  demo: true;
}

export type DeliveryStatus = "Arrival Detected" | "Processing" | "Completed" | "Overdue" | "Needs Review";
export interface DeliveryEvent {
  id: string;
  storeId: string;
  cameraId: string;
  arrival: number;
  started: number | null;
  completed: number | null;
  status: DeliveryStatus;
  evidence: boolean;
  notes: string;
  demo: true;
}

export type BagCheckStatus = "Verified" | "Not Detected" | "Needs Review" | "Manually Confirmed" | "Exception Recorded";
export interface BagCheckEvent {
  id: string;
  ts: number;
  storeId: string;
  employeeRef: string | null;
  departure: string;
  detected: boolean;
  status: BagCheckStatus;
  evidence: boolean;
  notes: Note[];
  demo: true;
}

export type Channel = "SMS" | "WhatsApp" | "Email" | "In-app";
export type DeliveryState = "Queued" | "Sent" | "Delivered" | "Failed" | "Unknown";
export interface NotificationRecord {
  id: string;
  eventId: string;
  ts: number;
  storeId: string;
  channel: Channel;
  recipient: string;
  summary: string;
  status: DeliveryState;
  failure: string | null;
  simulated: boolean;
  demo: true;
}

export type Module = "Customers" | "Security" | "Employees" | "Deliveries" | "Compliance" | "Cameras" | "Notifications";
export interface SystemEvent {
  id: string;
  ts: number;
  storeId: string;
  module: Module;
  type: string;
  cameraId: string | null;
  severity: Severity | null;
  status: string;
  evidence: boolean;
  demo: true;
}

export interface AuditEvent {
  id: string;
  ts: number;
  actor: string;
  action: string;
  target: string;
}

export interface DashboardSummary {
  entries: number;
  exits: number;
  occupancy: number;
  alerts: number;
  compliance: number | null;
  cameraOnlinePct: number;
}

export type Role = "Owner" | "Administrator" | "Store Manager" | "Security Reviewer" | "Read-Only Analyst";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Settings {
  orgName: string;
  timezone: string;
  dateFormat: "MMM d, HH:mm" | "dd/MM HH:mm";
  defaultRange: RangeKey;
  inactivityMin: number;
  idleRegisterSec: number;
  prolongedSittingMin: number;
  deliveryThresholdMin: number;
  minConfidence: number;
  retentionDays: number;
  quietStart: string;
  quietEnd: string;
  rules: Record<string, Channel[]>;
}

export type RangeKey = "today" | "yesterday" | "7d" | "30d" | "custom";
