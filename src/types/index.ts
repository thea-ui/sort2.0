export type Role = 'STUDENT' | 'TEACHER' | 'MRF' | 'ADMIN';

export type ReportStatus = 'PENDING' | 'DISPATCHED' | 'COLLECTED' | 'RESOLVED' | 'DISMISSED';

export type WasteCategory = 'RECYCLABLE' | 'BIODEGRADABLE' | 'NON_BIODEGRADABLE' | 'ORGANIC' | 'HAZARDOUS' | 'GENERAL';

export interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: Role;
  points: number;
  warningsCount: number;
  certificatesEarned: string[]; // names of certificates earned
  classroomSection?: string; // used for teachers/students
  accountStatus?: 'ACTIVE' | 'SUSPENDED';
  suspendedUntil?: string;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  status: ReportStatus;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  category: WasteCategory;
  coordinates: {
    lat: number;
    lng: number;
  };
  locationName: string;
  reporterId: string;
  reporterName: string;
  reporterRole?: 'student' | 'teacher' | 'admin' | 'mrf';
  pointsAwarded: number;
  timestamp: string;
  imageUrl?: string;
  weightCollected?: number; // MRF logs kg weight upon collection
  isVerified?: boolean;
  assignedMrfId?: string;
  assignedMrfName?: string;
  reportType?: 'WASTE' | 'ASSET';
  reporterRank?: number | null;
  pointsAwardedAt?: string | null;
  completionNotes?: string;
  collectedOutcome?: string;
  isScatteredDebris?: boolean;
  completedAt?: string;
}

export type BinStreamState = 'Available' | 'Unavailable' | 'No Bin';

export interface BinStatus {
  id: string;
  name: string;
  locationName: string;
  fillLevel: number; // 0 to 100
  type: WasteCategory;
  coordinates: {
    lat: number;
    lng: number;
  };
  x?: number;
  y?: number;
  activeDispatch: boolean;
  lastEmptied?: string;
  streamStatus?: BinStreamState;
}

export type Bin = BinStatus;

export interface Challenge {
  id: string;
  title: string;
  description: string;
  pointsAwarded: number;
  target: number; // target count
  progress: number; // current count
  completed: boolean;
  iconName: string;
}

export interface PointHistory {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  timestamp: string;
}

export interface Offense {
  id: string;
  userId: string;
  userName: string;
  description: string;
  severity: 'WARNING' | 'DEDUCT' | 'SUSPENSION';
  timestamp: string;
  expiresAt?: string;
}

export interface SystemSettings {
  pointsPerReport: number;
  pointsPerKgRecyclable: number;
  warningThreshold: number;
  certificatePointThreshold: number;
  quarterGateActive: boolean;
  maxUnverifiedReports: number;
  dismissPointPenalty: number;
  falseReportPointPenalty: number;
  warningAutoDeductAmount: number;
  suspensionDurationHours: number;
  rewardsReservePercent: number;
  defaultVendorName: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'COLLECTION' | 'EVENT' | 'MAINTENANCE';
  description: string;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  system: string;
  status: 'SUCCESS' | 'FAILED';
  recordsSynced: number;
}

export interface CampusNewsArticle {
  id: string;
  tag: string;
  tagType: 'MRF Update' | 'New Facility' | 'Achievement' | 'Event' | 'Program' | 'Research';
  title: string;
  description: string;
  date: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  actionType: 'AUTH' | 'DISMISSAL' | 'VERIFICATION' | 'DISPATCH' | 'SETTINGS';
  details: string;
}

export type CategoryStreamType = 'BIODEGRADABLE' | 'NON_BIODEGRADABLE' | 'RECYCLABLE';

export interface StreamBinStatus {
  type: CategoryStreamType;
  status: BinStreamState;
}

export interface BinLocationItem {
  id: string;
  name: string;
  code: string;
  status: 'Available' | 'Unavailable';
  x: number; // coordinate X (0 to 100)
  y: number; // coordinate Y (0 to 100)
  alert?: string;
  streams: StreamBinStatus[];
}

export type NotificationType = 'REPORT_SUBMITTED' | 'REPORT_VERIFIED' | 'REPORT_DISPATCHED' | 'REPORT_COMPLETED' | 'REPORT_DISMISSED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  reportId: string;
  recipientId: string;
  timestamp: string;
}


