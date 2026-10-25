import React from 'react';
import { Droplets, PackageX, Recycle } from 'lucide-react';
import { Bin, Report } from '../../../../types';

export type BinCategory = 'BIODEGRADABLE' | 'NON_BIODEGRADABLE' | 'RECYCLABLE';
export type BinReportStatusState = 'AVAILABLE' | 'REPORTED_FULL' | 'DISPATCHED' | 'LIMIT_REACHED' | 'NO_BIN' | 'UNAVAILABLE';

export interface BinSlot {
  bin: Bin | null;
  type: BinCategory;
  statusState: BinReportStatusState;
  isAvailable: boolean;
  reason: string;
  unverifiedCount: number;
  activeReport?: Report;
}

export interface StationCluster {
  locationName: string;
  coordinates: { lat: number; lng: number };
  x?: number;
  y?: number;
  slots: BinSlot[];
}

export const CATEGORY_ORDER: BinCategory[] = ['BIODEGRADABLE', 'NON_BIODEGRADABLE', 'RECYCLABLE'];

export const CAT_META: Record<BinCategory, { label: string; short: string; bg: string; border: string; text: string; Icon: React.FC<{ size?: number; className?: string }>; desc: string }> = {
  BIODEGRADABLE:     { label: 'Biodegradable',     short: 'Bio', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-600', Icon: Droplets,     desc: 'Food scraps, organic waste & plant leaves' },
  NON_BIODEGRADABLE: { label: 'Non-Biodegradable', short: 'Non', bg: 'bg-slate-800',   border: 'border-slate-600',   text: 'text-slate-700',   Icon: PackageX,     desc: 'Wrappers, plastic films & residual waste (black/blue bin)' },
  RECYCLABLE:        { label: 'Recyclable',         short: 'Rec', bg: 'bg-sky-500',     border: 'border-sky-400',     text: 'text-sky-600',     Icon: Recycle,      desc: 'PET bottles, aluminum cans, glass & cardboard' },
};

export function getBinSlotDetails(bin: Bin | null, reports: Report[] = []): {
  statusState: BinReportStatusState;
  isAvailable: boolean;
  reason: string;
  unverifiedCount: number;
  activeReport?: Report;
} {
  if (!bin || bin.streamStatus === 'No Bin') {
    return { statusState: 'NO_BIN', isAvailable: false, reason: 'No Bin at Location', unverifiedCount: 0 };
  }

  if (bin.streamStatus === 'Unavailable') {
    return { statusState: 'LIMIT_REACHED', isAvailable: false, reason: 'Unavailable (3/3 Waiting Verification)', unverifiedCount: 0 };
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
      statusState: 'DISPATCHED',
      isAvailable: false,
      reason: 'Pending Pick Up',
      unverifiedCount: unverifiedPending.length,
      activeReport: activeReports[0]
    };
  }

  if (bin.fillLevel >= 90) {
    return { statusState: 'REPORTED_FULL', isAvailable: false, reason: 'Reported Full', unverifiedCount: 0 };
  }

  return {
    statusState: 'AVAILABLE',
    isAvailable: true,
    reason: 'Available',
    unverifiedCount: unverifiedPending.length,
    activeReport: activeReports[0]
  };
}

export function groupStations(bins: Bin[], reports: Report[] = []): StationCluster[] {
  const map = new Map<string, { coords: { lat: number; lng: number }; x?: number; y?: number; byType: Map<BinCategory, Bin> }>();
  for (const bin of bins) {
    if (!map.has(bin.locationName)) {
      map.set(bin.locationName, { coords: bin.coordinates, x: bin.x, y: bin.y, byType: new Map() });
    }
    const t = bin.type as BinCategory;
    if (CATEGORY_ORDER.includes(t)) map.get(bin.locationName)!.byType.set(t, bin);
  }

  return Array.from(map.entries()).map(([locationName, data]) => ({
    locationName,
    coordinates: data.coords,
    x: data.x,
    y: data.y,
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
    }),
  }));
}
