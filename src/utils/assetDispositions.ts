export type AssetAction = 'RECOVERED' | 'REPAIRED' | 'DISPOSED';

export interface AssetDisposition {
  value: string;
  action: AssetAction;
  condition: string;
  /** Recovered items that are weighed & sold as recyclable scrap. */
  scrap?: boolean;
  /** Hazardous e-waste requiring a DENR-accredited handler. */
  hazmat?: boolean;
  group: 'Reuse / Recovery' | 'Disposal';
  /** Human-readable explanation of what this outcome means. */
  description: string;
}

/**
 * DepEd/COA-aligned asset dispositions. Each maps a specific outcome to a
 * ledger action + condition, and carries guidance shown in the UI.
 */
export const ASSET_DISPOSITIONS: AssetDisposition[] = [
  {
    value: 'Recovered — awaiting assessment',
    action: 'RECOVERED',
    condition: 'NEEDS_REPAIR',
    group: 'Reuse / Recovery',
    description: 'Pulled from service and held for assessment before any repair work begins.',
  },
  {
    value: 'Repaired On-Site (returned to service)',
    action: 'REPAIRED',
    condition: 'GOOD',
    group: 'Reuse / Recovery',
    description: 'Fixed in place and returned to normal use without leaving the campus.',
  },
  {
    value: 'Repaired at MRF Workshop',
    action: 'REPAIRED',
    condition: 'GOOD',
    group: 'Reuse / Recovery',
    description: 'Brought to the Materials Recovery Facility workshop, repaired, and returned to service.',
  },
  {
    value: 'Repurposed / Upcycled',
    action: 'REPAIRED',
    condition: 'FAIR',
    group: 'Reuse / Recovery',
    description: 'Rebuilt into a new use or upcycled instead of being discarded.',
  },
  {
    value: 'Reassigned / Redeployed',
    action: 'REPAIRED',
    condition: 'GOOD',
    group: 'Reuse / Recovery',
    description: 'Reassigned to another room or office that needs the asset.',
  },
  {
    value: 'Stored for Future Repair',
    action: 'RECOVERED',
    condition: 'NEEDS_REPAIR',
    group: 'Reuse / Recovery',
    description: 'Kept in stock for a future repair cycle; not yet returned to service.',
  },
  {
    value: 'Cannibalized for Spare Parts',
    action: 'DISPOSED',
    condition: 'DISPOSED',
    group: 'Disposal',
    description: 'Dismantled — usable parts harvested for other repairs, the remainder discarded.',
  },
  {
    value: 'Declared Unserviceable → Scrap',
    action: 'DISPOSED',
    condition: 'DISPOSED',
    scrap: true,
    group: 'Disposal',
    description: 'Beyond repair. Weighed and sold as recyclable scrap stock to recover material value.',
  },
  {
    value: 'e-Waste → Accredited Handler',
    action: 'DISPOSED',
    condition: 'DISPOSED',
    hazmat: true,
    group: 'Disposal',
    description: 'Hazardous electronic waste routed to a DENR-accredited handler. It is never sold as ordinary scrap.',
  },
];

const BY_VALUE = new Map(ASSET_DISPOSITIONS.map((d) => [d.value, d]));

/** Look up a disposition by its stored label. Falls back to a legacy alias match. */
export function getAssetDisposition(value?: string | null): AssetDisposition | undefined {
  if (!value) return undefined;
  const direct = BY_VALUE.get(value);
  if (direct) return direct;
  const needle = value.toLowerCase();
  return ASSET_DISPOSITIONS.find((d) => d.value.toLowerCase() === needle);
}

/** Fallback guidance when only the generic action is known (legacy records). */
export const ASSET_ACTION_GUIDANCE: Record<AssetAction, { label: string; group: string; description: string }> = {
  RECOVERED: {
    label: 'Recovered',
    group: 'Reuse / Recovery',
    description: 'The asset was recovered and logged for assessment or future repair.',
  },
  REPAIRED: {
    label: 'Repaired',
    group: 'Reuse / Recovery',
    description: 'The asset was repaired and returned to service.',
  },
  DISPOSED: {
    label: 'Disposed',
    group: 'Disposal',
    description: 'The asset was disposed of through an approved disposition route.',
  },
};
