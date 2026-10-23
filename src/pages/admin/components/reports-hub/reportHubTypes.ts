import type { WasteCategory } from '../../../../types';

/** Folder sections of the Reports hub. LEDGER holds sold-scrap sales records. */
export type HubSection = 'WASTE' | 'ASSET' | 'LEDGER' | 'RECORDS';

export type HubSort = 'newest' | 'oldest' | 'title' | 'weight';

export interface ReportHubFilters {
  /** 'ALL' or a school year id. Applied at fetch time where possible. */
  yearId: string;
  /** YYYY-MM-DD or ''. */
  from: string;
  to: string;
  /** Empty = every status (EXPIRED included: this is the archive view). */
  statuses: string[];
  /** Empty = every grade level (student reports only). */
  gradeLevels: string[];
  query: string;
  sort: HubSort;
}

export const DEFAULT_HUB_FILTERS: ReportHubFilters = {
  yearId: 'ALL',
  from: '',
  to: '',
  statuses: [],
  gradeLevels: [],
  query: '',
  sort: 'newest',
};

/** A report flattened into every field the hub and printouts display. */
export interface ReportHubRow {
  id: string;
  date: string;
  title: string;
  kind: 'WASTE' | 'ASSET';
  stream: WasteCategory;
  materialCode?: string;
  materialName?: string;
  assetCategoryCode?: string;
  assetCategoryName?: string;
  assetItemName?: string;
  reporterName: string;
  reporterMeta?: string;
  /** EnrollPro-synced grade level / section (students). */
  gradeLevel?: string;
  sectionName?: string;
  locationName: string;
  status: string;
  urgency: string;
  weightKg: number;
  points: number;
}

/** A sale record (recyclables market or asset scrap) flattened for display. */
export interface LedgerRow {
  id: string;
  date: string;
  kind: 'MARKET' | 'SCRAP';
  materialCode: string;
  materialName: string;
  weightKg: number;
  pricePerKg: number;
  revenue: number;
  buyerName: string;
}

/** A walk-in bottle turnover flattened for display. */
export interface WalkInRow {
  id: string;
  date: string;
  studentName: string;
  gradeLevel?: string;
  sectionName?: string;
  bottles: number;
  ml: number;
  grams: number;
  points: number;
  recordedBy: string;
}

/** A point-ledger entry (earned or deducted) for a school year. */
export interface PointRecord {
  id: string;
  yearId: string;
  yearLabel: string;
  date: string;
  studentName: string;
  gradeLevel?: string;
  /** Signed: positive awards, negative deductions. */
  amount: number;
  reason: string;
}

/** A closing-points leaderboard snapshot taken when a year rolls over. */
export interface LeaderboardRecord {
  id: string;
  yearId: string;
  yearLabel: string;
  rank: number;
  studentName: string;
  gradeLevel?: string;
  sectionName?: string;
  closingPoints: number;
}

/** A market stock snapshot (opening/closing kilos per material) for a year. */
export interface StockRecord {
  id: string;
  yearId: string;
  yearLabel: string;
  categoryName: string;
  openingKg: number;
  closingKg: number;
}

/** What the print page must show; carried through the URL. */
export interface PrintTarget {
  section: 'waste' | 'asset' | 'ledger-market' | 'ledger-scrap' | 'walkin' | 'points' | 'leaderboard' | 'stock';
  stream?: string;
  material?: string;
  categoryCode?: string;
  /** Item preset name, or '__other__' for the fallback item bucket. */
  itemName?: string;
}

export interface HubFolderNode {
  id: string;
  name: string;
  subtitle?: string;
  count: number;
  latestAt: string | null;
  children?: HubFolderNode[];
  /** Set on leaves: clicking opens the print page for exactly this folder. */
  print?: PrintTarget;
}

export interface HubRootFolder extends HubFolderNode {
  section: HubSection;
  description: string;
}
