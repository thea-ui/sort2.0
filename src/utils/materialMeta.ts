import type { ElementType } from 'react';
import { Boxes, Cpu, Cylinder, FileText, Package, TreePine, Wine, Wrench } from 'lucide-react';

export interface ScrapMaterialMeta {
  icon: ElementType;
  bgColor: string;
  color: string;
  barColor: string;
  strongColor: string;
}

/**
 * Shared visual metadata for asset-scrap material codes (admin Collections +
 * MRF Scrap Stock). Accents follow the content ramp (accent → gold,
 * `--ramp-1..4`) so each material keeps one shade; hazmat (E-Waste) stays
 * rose as a universal safety signal.
 */
export const SCRAP_MATERIAL_META: Record<string, ScrapMaterialMeta> = {
  ferrous_metal: {
    icon: Wrench,
    bgColor: 'bg-[var(--ramp-1)]/10',
    color: 'text-[var(--ramp-1)]',
    barColor: 'bg-[var(--ramp-1)]',
    strongColor: 'text-[var(--ramp-1-strong)]',
  },
  non_ferrous_metal: {
    icon: Cylinder,
    bgColor: 'bg-[var(--ramp-2)]/10',
    color: 'text-[var(--ramp-2)]',
    barColor: 'bg-[var(--ramp-2)]',
    strongColor: 'text-[var(--ramp-2-strong)]',
  },
  e_waste: {
    icon: Cpu,
    bgColor: 'bg-rose-50',
    color: 'text-rose-600',
    barColor: 'bg-rose-400',
    strongColor: 'text-rose-700',
  },
  plastic: {
    icon: Package,
    bgColor: 'bg-[var(--ramp-3)]/10',
    color: 'text-[var(--ramp-3)]',
    barColor: 'bg-[var(--ramp-3)]',
    strongColor: 'text-[var(--ramp-3-strong)]',
  },
  wood: {
    icon: TreePine,
    bgColor: 'bg-[var(--ramp-4)]/10',
    color: 'text-[var(--ramp-4)]',
    barColor: 'bg-[var(--ramp-4)]',
    strongColor: 'text-[var(--ramp-4-strong)]',
  },
  glass: {
    icon: Wine,
    bgColor: 'bg-[var(--ramp-1)]/10',
    color: 'text-[var(--ramp-1)]',
    barColor: 'bg-[var(--ramp-1)]',
    strongColor: 'text-[var(--ramp-1-strong)]',
  },
  mixed: {
    icon: Boxes,
    bgColor: 'bg-[var(--ramp-2)]/10',
    color: 'text-[var(--ramp-2)]',
    barColor: 'bg-[var(--ramp-2)]',
    strongColor: 'text-[var(--ramp-2-strong)]',
  },
};

export const FALLBACK_SCRAP_META = SCRAP_MATERIAL_META.mixed;

/** Icons for the recyclable market categories (MRF Recycle Market folders). */
export const RECYCLABLE_CATEGORY_ICONS: Record<string, ElementType> = {
  pet_plastic: Package,
  aluminum_cans: Cylinder,
  cardboard: FileText,
  glass: Wine,
};
