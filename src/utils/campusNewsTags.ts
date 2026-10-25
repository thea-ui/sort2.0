export interface CampusNewsTagStyle {
  badge: string;
  iconTint: string;
}

const DEFAULT_STYLE: CampusNewsTagStyle = {
  badge: 'border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent-dark)]',
  iconTint: 'bg-[var(--accent)]/10 text-[var(--accent)]',
};

const TAG_STYLES: Record<string, CampusNewsTagStyle> = {
  ACHIEVEMENT: {
    badge: 'border-[var(--gold)]/30 bg-[color-mix(in_srgb,var(--gold)_12%,white)] text-[var(--gold-strong)]',
    iconTint: 'bg-[color-mix(in_srgb,var(--gold)_15%,white)] text-[var(--gold-strong)]',
  },
  'MRF UPDATE': {
    badge: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    iconTint: 'bg-emerald-100 text-emerald-700',
  },
  EVENT: {
    badge: 'border-rose-200 bg-rose-100 text-rose-700',
    iconTint: 'bg-rose-100 text-rose-600',
  },
  'NEW FACILITY': {
    badge: 'border-sky-200 bg-sky-100 text-sky-700',
    iconTint: 'bg-sky-100 text-sky-600',
  },
  PROGRAM: {
    badge: 'border-violet-200 bg-violet-100 text-violet-700',
    iconTint: 'bg-violet-100 text-violet-600',
  },
  RESEARCH: {
    badge: 'border-indigo-200 bg-indigo-100 text-indigo-700',
    iconTint: 'bg-indigo-100 text-indigo-600',
  },
  UPDATE: {
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
    iconTint: 'bg-slate-100 text-slate-600',
  },
};

export const getCampusNewsTagStyle = (tag?: string): CampusNewsTagStyle =>
  TAG_STYLES[(tag || '').trim().toUpperCase()] || DEFAULT_STYLE;
