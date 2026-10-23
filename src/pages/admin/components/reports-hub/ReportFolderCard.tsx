import React from 'react';
import { Armchair, ChevronRight, FileSpreadsheet, Recycle, Trophy } from 'lucide-react';
import { formatLongDate } from '../../../../utils/dateFormat';
import type { HubFolderNode, HubRootFolder, HubSection } from './reportHubTypes';

const SECTION_ICONS: Record<HubSection, React.ComponentType<{ size?: number | string; className?: string }>> = {
  WASTE: Recycle,
  ASSET: Armchair,
  LEDGER: FileSpreadsheet,
  RECORDS: Trophy,
};

export type FolderNoun = 'reports' | 'records' | 'sales' | 'turnovers';

const NOUN_LABELS: Record<FolderNoun, { single: string; empty: string }> = {
  reports: { single: 'report', empty: 'No reports yet' },
  records: { single: 'record', empty: 'No records yet' },
  sales: { single: 'sale', empty: 'No sales yet' },
  turnovers: { single: 'turnover', empty: 'No turnovers yet' },
};

function countLabel(count: number, noun: FolderNoun): string {
  const labels = NOUN_LABELS[noun];
  if (count === 0) return labels.empty;
  return `${count} ${count === 1 ? labels.single : noun}`;
}

interface ReportFolderTileProps {
  folder: HubRootFolder;
  noun?: FolderNoun;
  /** Position in the root row → --ramp-1..4 (accent → gold), like the KPI cards. */
  rampIndex?: number;
  onOpen: (folder: HubRootFolder) => void;
}

/** Root-level folder tile (Waste / Asset / Ledger / Year Records). */
export const ReportFolderTile: React.FC<ReportFolderTileProps> = ({
  folder,
  noun = 'reports',
  rampIndex = 0,
  onOpen,
}) => {
  const Icon = SECTION_ICONS[folder.section];
  const rampNumber = Math.min(rampIndex + 1, 4);
  return (
    <button
      type="button"
      onClick={() => onOpen(folder)}
      style={
        {
          '--ramp': `var(--ramp-${rampNumber})`,
          '--ramp-strong': `var(--ramp-${rampNumber}-strong)`,
        } as React.CSSProperties
      }
      className="w-full h-full text-left flex flex-col bg-white/95 border border-[var(--ramp)]/35 rounded-3xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-[var(--ramp)]/60 transition-all cursor-pointer"
    >
      {/* Top: title centered against the icon */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-bold text-[var(--text-strong)] leading-tight">{folder.name}</p>
        <span className="h-9 w-9 shrink-0 rounded-xl bg-[var(--ramp)] text-white flex items-center justify-center shadow-xs">
          <Icon size={17} />
        </span>
      </div>
      <p className="text-xs text-[var(--text-strong)]/50 mt-1">{folder.description}</p>

      {/* Bottom: count + latest date + chevron */}
      <div className="mt-auto pt-4 flex items-center gap-2">
        <span className="shrink-0 px-3 py-1 rounded-full text-[11px] font-bold bg-[color-mix(in_srgb,var(--ramp)_15%,white)] border border-[var(--ramp)]/30 text-[var(--ramp-strong)]">
          {countLabel(folder.count, noun)}
        </span>
        <span className="text-[11px] text-[var(--text-strong)]/45 truncate">
          Latest: {folder.latestAt ? formatLongDate(folder.latestAt) : '—'}
        </span>
        <ChevronRight size={16} className="ml-auto shrink-0 text-[var(--ramp-strong)]/70" />
      </div>
    </button>
  );
};

interface ReportFolderRowProps {
  folder: HubFolderNode;
  noun?: FolderNoun;
  onOpen: (folder: HubFolderNode) => void;
}

/** Drill-down folder row (settings-list style from the design reference). */
export const ReportFolderRow: React.FC<ReportFolderRowProps> = ({ folder, noun = 'reports', onOpen }) => {
  const hasChildren = Boolean(folder.children && folder.children.length > 0);
  const isLeaf = Boolean(folder.print) && !hasChildren;
  const disabled = isLeaf && folder.count === 0;
  // Walk-in records are turnovers, not sales, even inside the Ledger section.
  const effectiveNoun: FolderNoun = folder.print?.section === 'walkin' ? 'turnovers' : noun;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onOpen(folder)}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border text-left transition ${
        disabled
          ? 'opacity-55 cursor-default bg-[color-mix(in_srgb,var(--primary)_3%,white)] border-[var(--primary)]/5'
          : 'bg-[color-mix(in_srgb,var(--primary)_4%,white)] border-[var(--primary)]/10 hover:bg-[color-mix(in_srgb,var(--primary)_7%,white)] hover:border-[var(--accent)]/30 cursor-pointer'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--text-strong)] truncate">{folder.name}</p>
        <p className="text-[11px] text-[var(--text-strong)]/45 mt-0.5 truncate">
          {folder.subtitle ?? (folder.latestAt ? `Latest: ${formatLongDate(folder.latestAt)}` : 'No activity yet')}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-bold ${
            folder.count === 0
              ? 'bg-transparent text-[var(--text-strong)]/40 border border-[var(--primary)]/10'
              : 'bg-[var(--accent)]/10 text-[var(--text-strong)]'
          }`}
        >
          {countLabel(folder.count, effectiveNoun)}
        </span>
        {hasChildren ? (
          <ChevronRight size={16} className="text-[var(--text-strong)]/35" />
        ) : folder.count > 0 ? (
          <ChevronRight size={16} className="text-[var(--accent)]" />
        ) : (
          <ChevronRight size={16} className="text-[var(--text-strong)]/15" />
        )}
      </div>
    </button>
  );
};
