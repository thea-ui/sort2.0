export type Role = 'STUDENT' | 'TEACHER' | 'MRF' | 'ADMIN';

export type ReportStatus = 'PENDING' | 'DISPATCHED' | 'COLLECTED' | 'RESOLVED';

export type WasteCategory = 'RECYCLABLE' | 'ORGANIC' | 'HAZARDOUS' | 'GENERAL';

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
  pointsAwarded: number;
  timestamp: string;
  imageUrl?: string;
  weightCollected?: number; // MRF logs kg weight upon collection
}

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
  activeDispatch: boolean;
  lastEmptied?: string;
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
  severity: 'WARNING' | 'STRIKE' | 'SUSPENSION';
  timestamp: string;
}

export interface SystemSettings {
  pointsPerReport: number;
  pointsPerKgRecyclable: number;
  warningThreshold: number;
  certificatePointThreshold: number;
  quarterGateActive: boolean;
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
