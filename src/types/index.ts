export type Role = 'STUDENT' | 'TEACHER' | 'MRF' | 'ADMIN';

export type ReportStatus = 'PENDING' | 'DISPATCHED' | 'COLLECTED' | 'RESOLVED' | 'DISMISSED' | 'EXPIRED';

// Canonical waste streams mirror the Prisma `WasteCategory` enum
// (DepEd Order No. 5, s. 2014: biodegradable / non-biodegradable / hazardous;
//  RA 9003 additionally recognises recyclable).
// `ORGANIC` and `GENERAL` are LEGACY aliases still present in older cached
// records. The API normalises ORGANIC -> BIODEGRADABLE and GENERAL ->
// NON_BIODEGRADABLE on write, so new records must never use them.
export type WasteCategory =
  | 'RECYCLABLE'
  | 'BIODEGRADABLE'
  | 'NON_BIODEGRADABLE'
  | 'HAZARDOUS'
  | 'ORGANIC' // legacy alias -> BIODEGRADABLE
  | 'GENERAL'; // legacy alias -> NON_BIODEGRADABLE

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
  quarterCode?: string;
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

// ─── Walk-in Bottle Turnovers & Prize Claims ─────────────────────────

export type RewardType = 'POINTS' | 'PHYSICAL';
export type RewardClaimStatus = 'UNLOCKED' | 'REQUESTED' | 'RELEASED' | 'CANCELLED';

export interface WalkInStudentOption {
  id: string;
  name: string;
  gradeLevel?: string | null;
  sectionName?: string | null;
  points: number;
  syncSource?: string;
}

export interface WalkInTurnoverItem {
  bottleMl: number;
  quantity: number;
  grams: number;
}

export interface WalkInTurnover {
  id: string;
  studentId: string;
  recordedByName?: string;
  totalMl: number;
  totalBottles: number;
  totalGrams: number;
  pointsAwarded: number;
  ratePer500ml: number;
  notes?: string | null;
  createdAt: string;
  items: WalkInTurnoverItem[];
  student?: {
    id: string;
    name: string;
    gradeLevel?: string | null;
    sectionName?: string | null;
  };
}

export interface WalkInNextReward {
  id: string;
  code: string;
  title: string;
  iconName: string;
  rewardType: RewardType;
  requiredGrams: number;
  remainingGrams: number;
}

export interface WalkInProgress {
  yearGrams: number;
  yearMl: number;
  yearBottles: number;
  nextReward: WalkInNextReward | null;
}

export interface UnlockedClaimSummary {
  claimId: string;
  claimCode: string;
  reward: {
    id: string;
    code: string;
    title: string;
    iconName: string;
    rewardType: RewardType;
    requiredGrams: number;
  };
}

export interface RecordWalkInInput {
  studentId: string;
  items: { bottleMl: number; quantity: number }[];
  notes?: string;
  idempotencyKey: string;
}

export interface RecordWalkInResult {
  success: boolean;
  alreadyProcessed: boolean;
  turnover: WalkInTurnover;
  student: { id: string; name: string; points: number };
  progress: WalkInProgress;
  newlyUnlocked: UnlockedClaimSummary[];
}

export interface Reward {
  id: string;
  code: string;
  title: string;
  description: string;
  iconName: string;
  rewardType: RewardType;
  requiredGrams: number;
  pointsValue: number;
  stock: number | null;
  sortOrder?: number;
  isActive?: boolean;
  claimsCount?: number;
  progressGrams?: number;
  unlocked?: boolean;
  claim?: RewardClaim | null;
}

export interface RewardClaim {
  id: string;
  status: RewardClaimStatus;
  claimCode: string;
  gramsAtUnlock: number;
  unlockedAt: string;
  requestedAt?: string | null;
  releasedAt?: string | null;
  notes?: string | null;
  reward?: Reward;
  student?: {
    id: string;
    name: string;
    gradeLevel?: string | null;
    sectionName?: string | null;
    points?: number;
  };
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
  walkInPointsPer500ml?: number;
  walkInEnabled?: boolean;
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

// Segregation streams at a campus location. HAZARDOUS is required by
// DepEd Order No. 5, s. 2014 (red/orange bin).
export type CategoryStreamType = 'BIODEGRADABLE' | 'NON_BIODEGRADABLE' | 'RECYCLABLE' | 'HAZARDOUS';

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
  /** Exact user this notification belongs to. Never use 'admin' or a role name. */
  recipientId?: string;
  /** Role-wide delivery (e.g. the ADMIN review queue). Visible only to that role. */
  recipientRole?: Role;
  timestamp: string;
}

/** Payload accepted by the notification store before id/timestamp are assigned. */
export interface NotificationDraft {
  type: NotificationType;
  title: string;
  message: string;
  reportId: string;
  recipientId?: string;
  recipientRole?: Role;
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
  isEnded?: boolean;
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

// ─── ATLAS campus map mirror ──────────────────────────────────────────

export interface AtlasRoom {
  atlasId: number;
  name: string;
  floor: number;
  type: string;
  capacity: number | null;
  isTeachingSpace: boolean;
  isSharedFacility: boolean;
  floorPosition: number | null;
  features?: unknown;
}

export interface AtlasBuilding {
  atlasId: number;
  name: string;
  shortCode: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string | null;
  rotation: number;
  floorCount: number;
  isTeachingBuilding: boolean;
  rooms: AtlasRoom[];
}

export interface AtlasMapPayload {
  schoolId: number;
  syncedAt: string | null;
  stale: boolean;
  campusImageUrl: string | null;
  buildings: AtlasBuilding[];
}


