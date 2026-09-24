import React from 'react';
import {
  Armchair,
  Tv,
  Zap,
  Wrench,
  HelpCircle,
  Package,
  PackageX,
  Recycle,
  Droplets,
  Box,
  FileText,
  Wine,
  Trash,
  Trash2,
  Video,
  Monitor,
  Laptop,
  Speaker,
  Printer,
  Mic,
  Wifi,
  Cable,
  Lightbulb,
  Fan,
  ToggleLeft,
  Plug,
  DoorOpen,
  Blinds,
  PaintBucket,
  Hammer,
  AlertTriangle,
  Bug,
  FlaskConical,
  Target,
} from 'lucide-react';
// DepEd Order No. 5, s. 2014 requires segregation into biodegradable,
// non-biodegradable and hazardous/toxic waste. Recyclable is retained as an
// additional RA 9003 stream. Bin colours follow the DO 5 colour coding.
export type BinCategory = 'BIODEGRADABLE' | 'NON_BIODEGRADABLE' | 'RECYCLABLE' | 'HAZARDOUS';

export type InfrastructurePillar = 'waste' | 'furniture' | 'electronics' | 'fixtures' | 'equipment' | 'other';
export type BinReportStatusState = 'AVAILABLE' | 'REPORTED_FULL' | 'LIMIT_REACHED' | 'DISPATCHED' | 'NO_BIN' | 'UNAVAILABLE';

export interface BinSlot {
  type: BinCategory;
  bin: any | null;
  statusState: BinReportStatusState;
  isAvailable: boolean;
  reason: string;
  unverifiedCount: number;
  activeReport?: any;
}

export interface StationCluster {
  locationName: string;
  coordinates: { lat: number; lng: number };
  slots: [BinSlot, BinSlot, BinSlot, BinSlot];
}

export const CATEGORY_ORDER: BinCategory[] = ['BIODEGRADABLE', 'NON_BIODEGRADABLE', 'RECYCLABLE', 'HAZARDOUS'];

export const CAT_META: Record<
  BinCategory,
  {
    label: string;
    short: string;
    bg: string;
    border: string;
    text: string;
    Icon: React.FC<{ size?: number; className?: string }>;
    desc: string;
  }
> = {
  BIODEGRADABLE: {
    label: 'Biodegradable',
    short: 'Bio',
    bg: 'bg-emerald-500',
    border: 'border-emerald-400',
    text: 'text-emerald-600',
    Icon: Droplets,
    desc: 'Food scraps, organic waste & plant leaves',
  },
  NON_BIODEGRADABLE: {
    label: 'Non-Biodegradable',
    short: 'Non',
    bg: 'bg-slate-800',
    border: 'border-slate-600',
    text: 'text-slate-700',
    Icon: PackageX,
    desc: 'Wrappers, plastic films & residual waste (black/blue bin)',
  },
  RECYCLABLE: {
    label: 'Recyclable',
    short: 'Rec',
    bg: 'bg-[var(--primary)]',
    border: 'border-[var(--primary)]/25',
    text: 'text-[var(--text-strong)]',
    Icon: Recycle,
    desc: 'PET bottles, aluminum cans, glass & cardboard',
  },
  HAZARDOUS: {
    label: 'Hazardous',
    short: 'Haz',
    bg: 'bg-orange-500',
    border: 'border-orange-400',
    text: 'text-orange-600',
    Icon: AlertTriangle,
    desc: 'Batteries, bulbs, chemicals, sharps & e-waste (red/orange bin)',
  },
};

export const CATEGORY_DETAILS: Record<
  InfrastructurePillar,
  {
    label: string;
    title: string;
    subtitle: string;
    icon: React.ComponentType<any>;
    itemsLabel: string;
    items: { id: string; label: string; icon: React.ComponentType<any> }[];
  }
> = {
  furniture: {
    label: 'Furniture',
    title: 'Report Furniture',
    subtitle: 'Chairs, tables, desks, cabinets',
    icon: Armchair,
    itemsLabel: 'Select Furniture *',
    items: [
      { id: 'arm-chair-plastic', label: 'Arm Chair (Plastic)', icon: Armchair },
      { id: 'arm-chair-wooden', label: 'Arm Chair (Wooden)', icon: Armchair },
      { id: 'office-chair', label: 'Office Chair', icon: Armchair },
      { id: 'student-desk', label: 'Student Desk', icon: Armchair },
      { id: 'teachers-table', label: "Teacher's Table", icon: Armchair },
      { id: 'wooden-table', label: 'Wooden Table', icon: Armchair },
      { id: 'filing-cabinet', label: 'Filing Cabinet', icon: Box },
      { id: 'bookshelf', label: 'Bookshelf', icon: Box },
      { id: 'whiteboard-stand', label: 'Whiteboard Stand', icon: FileText },
    ],
  },
  waste: {
    label: 'Waste / Bin',
    title: 'Report Waste / Bin',
    subtitle: 'Litter issues, overflows',
    icon: Trash2,
    itemsLabel: 'Select Waste Category *',
    items: [
      { id: 'biodegradable', label: 'Biodegradable', icon: Droplets },
      { id: 'non-biodegradable', label: 'Non-Biodegradable', icon: PackageX },
      { id: 'recyclable', label: 'Recyclable', icon: Recycle },
      { id: 'hazardous', label: 'Hazardous / Toxic', icon: AlertTriangle },
      { id: 'plastic-bottles', label: 'Plastic Bottles', icon: Trash },
      { id: 'glass-bottles', label: 'Glass Bottles / Containers', icon: Wine },
      { id: 'aluminum-cans', label: 'Aluminum Cans', icon: Trash },
      { id: 'paper-cardboard', label: 'Paper & Cardboard', icon: Box },
      { id: 'residual-waste', label: 'Residual Waste / Litter', icon: Trash2 },
    ],
  },
  electronics: {
    label: 'Electronics',
    title: 'Report Electronics',
    subtitle: 'Projectors, display screens',
    icon: Tv,
    itemsLabel: 'Select Electronics *',
    items: [
      { id: 'projector', label: 'Projector', icon: Video },
      { id: 'display-monitor', label: 'Display Monitor / TV', icon: Monitor },
      { id: 'desktop-pc', label: 'Desktop PC', icon: Monitor },
      { id: 'laptop', label: 'Laptop', icon: Laptop },
      { id: 'speaker-system', label: 'Speaker / Sound System', icon: Speaker },
      { id: 'printer-scanner', label: 'Printer / Scanner', icon: Printer },
      { id: 'microphone', label: 'Microphone', icon: Mic },
      { id: 'router-ap', label: 'Wi-Fi Router / Access Point', icon: Wifi },
      { id: 'cable-adapter', label: 'Cable / Adapter', icon: Cable },
    ],
  },
  fixtures: {
    label: 'Fixtures',
    title: 'Report Fixtures',
    subtitle: 'AC, fans, lights, switches',
    icon: Zap,
    itemsLabel: 'Select Fixtures *',
    items: [
      { id: 'ceiling-light', label: 'Ceiling Light / Bulb', icon: Lightbulb },
      { id: 'ac-unit', label: 'Air Conditioner (AC)', icon: Zap },
      { id: 'light-switch', label: 'Light Switch', icon: ToggleLeft },
      { id: 'electrical-outlet', label: 'Electrical Socket / Outlet', icon: Plug },
      { id: 'ceiling-fan', label: 'Ceiling Fan', icon: Fan },
      { id: 'door-lock', label: 'Door Lock / Handle', icon: DoorOpen },
      { id: 'window-blinds', label: 'Window Blinds / Glass', icon: Blinds },
      { id: 'water-dispenser', label: 'Water Dispenser / Sink', icon: Droplets },
      { id: 'whiteboard-chalkboard', label: 'Whiteboard / Chalkboard', icon: FileText },
    ],
  },
  equipment: {
    label: 'Equipment',
    title: 'Report Equipment',
    subtitle: 'Lab tools, janitorial assets',
    icon: Wrench,
    itemsLabel: 'Select Equipment *',
    items: [
      { id: 'lab-tool', label: 'Lab Tool / Apparatus', icon: FlaskConical },
      { id: 'janitorial-cart', label: 'Janitorial Cart / Mop', icon: Wrench },
      { id: 'microscope', label: 'Science Microscope', icon: FlaskConical },
      { id: 'sports-gear', label: 'Gym / Sports Gear', icon: Target },
      { id: 'safety-equipment', label: 'Safety Equipment', icon: AlertTriangle },
      { id: 'podium-lectern', label: 'Podium / Lectern', icon: Mic },
      { id: 'extension-cord', label: 'Extension Cord', icon: Cable },
      { id: 'cleaning-supplies', label: 'Cleaning Supplies', icon: Droplets },
      { id: 'paper-shredder', label: 'Paper Shredder', icon: Printer },
    ],
  },
  other: {
    label: 'Other',
    title: 'Report General Repairs',
    subtitle: 'General structural repair',
    icon: HelpCircle,
    itemsLabel: 'Select Issue Type *',
    items: [
      { id: 'wall-damage', label: 'Wall Damage / Paint', icon: PaintBucket },
      { id: 'floor-tile', label: 'Floor Tile / Carpet', icon: Hammer },
      { id: 'ceiling-leak', label: 'Ceiling Leak / Stain', icon: Droplets },
      { id: 'plumbing-pipe', label: 'Plumbing / Pipe', icon: Droplets },
      { id: 'structural-issue', label: 'Structural Issue', icon: Hammer },
      { id: 'safety-hazard', label: 'Safety Hazard', icon: AlertTriangle },
      { id: 'pest-issue', label: 'Pest Issue', icon: Bug },
      { id: 'general-repair', label: 'General Repair', icon: Wrench },
    ],
  },
};

import { getStoredRoomLocations, DEFAULT_ROOM_LOCATIONS } from '../../../services/locationStore';

export function getAssetRoomLocations(): string[] {
  return getStoredRoomLocations();
}

export const LOCATIONS = DEFAULT_ROOM_LOCATIONS;


export const CONDITIONS = [
  { id: 'Damaged', label: 'Damaged', desc: 'Broken but may be repairable' },
  { id: 'Malfunctioning', label: 'Malfunctioning', desc: 'Not working properly' },
  { id: 'Worn Out', label: 'Worn Out', desc: 'Heavy wear, needs replacement' },
  { id: 'Missing Parts', label: 'Missing Parts', desc: 'Incomplete, parts missing' },
];

export const URGENCIES = [
  { id: 'Low', label: 'Low', desc: 'Minor issue, no immediate impact', value: 'LOW' as const },
  { id: 'Normal', label: 'Normal', desc: 'Needs repair or attention soon', value: 'MEDIUM' as const },
  { id: 'Urgent', label: 'Urgent', desc: 'Dangerous condition (e.g. broken glass, unstable)', value: 'HIGH' as const },
];

export function getBinLocations(bins: any[] = []): string[] {
  if (Array.isArray(bins) && bins.length > 0) {
    const names = Array.from(new Set(bins.map((b: any) => b.locationName)));
    if (names.length > 0) return names;
  }
  return [
    'Main Courtyard (Quad)',
    'Science Hall Cafeteria Side',
    'Chemistry Building Entrance',
    'Main Library Lobby Entrance',
    'Sports Complex Entrance B',
  ];
}

export const BIN_LOCATIONS = [
  'Main Courtyard (Quad)',
  'Science Hall Cafeteria Side',
  'Chemistry Building Entrance',
  'Main Library Lobby Entrance',
  'Sports Complex Entrance B',
];

export function getBinSlotDetails(bin: any | null, reports: any[] = []) {
  if (!bin || bin.streamStatus === 'No Bin') {
    return { statusState: 'NO_BIN' as BinReportStatusState, isAvailable: false, reason: 'No Bin at Location', unverifiedCount: 0 };
  }

  if (bin.streamStatus === 'Unavailable') {
    return { statusState: 'LIMIT_REACHED' as BinReportStatusState, isAvailable: false, reason: 'Unavailable (3/3 Waiting Verification)', unverifiedCount: 0 };
  }

  const binLoc = bin.locationName.toLowerCase().trim();
  const activeReports = reports.filter(r => {
    const repLoc = (r.locationName || '').toLowerCase().trim();
    const repBaseLoc = repLoc.split(' - ')[0].split(' – ')[0].trim();
    const matchesLoc = repLoc.includes(binLoc) || binLoc.includes(repBaseLoc) || repLoc === binLoc;
    return matchesLoc && r.category === bin.type && (r.status === 'PENDING' || r.status === 'DISPATCHED');
  });

  const unverifiedPending = activeReports.filter(r => !r.isVerified && r.status === 'PENDING');
  const isVerifiedOrDispatched = activeReports.some(r => r.isVerified || r.status === 'DISPATCHED');

  if (isVerifiedOrDispatched || unverifiedPending.length >= 3) {
    return {
      statusState: 'DISPATCHED' as BinReportStatusState,
      isAvailable: false,
      reason: 'Pending Pick Up',
      unverifiedCount: unverifiedPending.length,
      activeReport: activeReports[0],
    };
  }

  if (bin.fillLevel >= 90) {
    return { statusState: 'REPORTED_FULL' as BinReportStatusState, isAvailable: false, reason: 'Reported Full', unverifiedCount: 0 };
  }

  return {
    statusState: 'AVAILABLE' as BinReportStatusState,
    isAvailable: true,
    reason: 'Available',
    unverifiedCount: unverifiedPending.length,
    activeReport: activeReports[0],
  };
}

export function groupStations(bins: any[], reports: any[] = []): StationCluster[] {
  const map = new Map<string, { coords: { lat: number; lng: number }; byType: Map<BinCategory, any> }>();
  for (const bin of bins) {
    if (!map.has(bin.locationName)) map.set(bin.locationName, { coords: bin.coordinates, byType: new Map() });
    const t = bin.type as BinCategory;
    if (CATEGORY_ORDER.includes(t)) map.get(bin.locationName)!.byType.set(t, bin);
  }

  return Array.from(map.entries()).map(([locationName, data]) => ({
    locationName,
    coordinates: data.coords,
    slots: CATEGORY_ORDER.map(type => {
      const bin = data.byType.get(type) ?? null;
      const details = getBinSlotDetails(bin, reports);
      return {
        type,
        bin,
        statusState: details.statusState,
        isAvailable: details.isAvailable,
        reason: details.reason,
        unverifiedCount: details.unverifiedCount,
        activeReport: details.activeReport,
      };
    }) as [BinSlot, BinSlot, BinSlot, BinSlot],
  }));
}
