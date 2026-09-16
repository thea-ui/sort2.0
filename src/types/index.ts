export type Role = 'STUDENT' | 'TEACHER' | 'MRF' | 'ADMIN';

export type ReportStatus = 'PENDING' | 'DISPATCHED' | 'COLLECTED' | 'RESOLVED' | 'DISMISSED' | 'EXPIRED';

export type WasteCategory = 'RECYCLABLE' | 'BIODEGRADABLE' | 'NON_BIODEGRADABLE' | 'ORGANIC' | 'HAZARDOUS' | 'GENERAL';

export type ChallengeType = 'REPORT_COUNT' | 'WEIGHT_COLLECTED' | 'HAZARDOUS_REPORT';

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
  gradeLevel?: string; // EnrollPro-synced grade level (students)
  sectionName?: string; // EnrollPro-synced section name (students)
  academicProgram?: string; // EnrollPro-synced program type
  accountStatus?: 'ACTIVE' | 'SUSPENDED';
  suspendedUntil?: string;
  portalAccountActive?: boolean;
  syncSource?: string;
  enrollproLrn?: string;
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
  code: string;
  title: string;
  description: string;
  challengeType: ChallengeType;
  pointsAwarded: number;
  target: number;
  isActive: boolean;
  iconName: string;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  currentCount: number;
  completed: boolean;
  completedAt?: string | null;
}

export interface PointHistory {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  challengeId?: string | null;
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
  certificateGraceDays: number;
  certificateMilestoneName: string;
  certificateChampionName: string;
  certificateLeaderName: string;
  certificateAdvocateName: string;
  quarterGateActive: boolean;
  maxUnverifiedReports: number;
  dismissPointPenalty: number;
  falseReportPointPenalty: number;
  warningAutoDeductAmount: number;
  suspensionDurationHours: number;
  rewardsReservePercent: number;
  defaultVendorName: string;
  binResetEnabled: boolean;
  binResetTime: string;
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

export interface VerifyAward {
  reportId: string;
  userId: string;
  amount: number;
  rank: number;
}

export interface ChallengeCompletion {
  userId: string;
  challengeId: string;
  title: string;
  pointsAwarded: number;
}

export interface VerifySingleResult {
  updatedReports: Report[];
  awards: VerifyAward[];
  challengeCompletions: ChallengeCompletion[];
  alreadyProcessed: boolean;
}

export interface VerifyBatchResult {
  updatedReports: Report[];
  awards: VerifyAward[];
  challengeCompletions: ChallengeCompletion[];
  summary: {
    totalProcessed: number;
    totalAwarded: number;
    totalPoints: number;
  };
}

export interface AdminChallenge extends Challenge {
  stats: {
    usersInProgress: number;
    completedCount: number;
    totalContributions: number;
  };
  hasProgress: boolean;
}

// ─── Certification ────────────────────────────────────────────────────

export type CertificateType = 'MILESTONE' | 'RANK';

export type CertificateTier = 'MILESTONE' | 'CHAMPION' | 'LEADER' | 'ADVOCATE';

export interface Certificate {
  id: string;
  userId: string;
  serial: string;
  type: CertificateType;
  tier: CertificateTier;
  name: string;
  rankAtIssue?: number | null;
  pointsAtIssue: number;
  termCode?: string | null;
  termName?: string | null;
  schoolYearId?: string | null;
  schoolYearLabel?: string | null;
  issuedAt: string;
  issuedBy?: string | null;
  templateVersion?: string;
  studentName?: string;
  gradeLevel?: string | null;
  sectionName?: string | null;
}

export type TermState = 'NO_TERM' | 'IN_TERM' | 'GRACE' | 'CLOSED';

export interface TermStatus {
  quarterCode: string | null;
  quarterName: string | null;
  startDate: string | null;
  endDate: string | null;
  state: TermState;
  graceDays: number;
  graceEndsAt: string | null;
  daysRemaining: number;
  issuanceOpen: boolean;
  isPeriodOver: boolean;
  resultsReady: boolean;
  awardedCount: number;
}

export interface TermStanding {
  userId: string;
  name: string;
  gradeLevel: string | null;
  sectionName: string | null;
  termPoints: number;
  totalPoints: number;
}

export interface IssueTermResult {
  message: string;
  quarterCode?: string;
  quarterName?: string;
  awarded: {
    id: string;
    userId: string;
    studentName: string;
    serial: string;
    tier: CertificateTier;
    name: string;
    rankAtIssue: number | null;
    pointsAtIssue: number;
  }[];
  alreadyIssued: number;
  standings: TermStanding[];
}


