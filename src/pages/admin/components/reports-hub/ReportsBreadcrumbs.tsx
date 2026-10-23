import React from 'react';
import { ArrowLeft, ChevronRight, FolderTree } from 'lucide-react';
import type { HubFolderNode } from './reportHubTypes';

interface ReportsBreadcrumbsProps {
  trail: HubFolderNode[];
  onNavigate: (depth: number) => void;
}

/** `Reports / Waste / Recyclable / PET Bottles` — Back pops one level. */
export const ReportsBreadcrumbs: React.FC<ReportsBreadcrumbsProps> = ({ trail, onNavigate }) => {
  // Back = one level up (root when already at a top-level folder).
  const backDepth = trail.length >= 2 ? trail.length - 2 : -1;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onNavigate(backDepth)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[var(--text-strong)]/70 hover:bg-[color-mix(in_srgb,var(--primary)_6%,white)] transition cursor-pointer"
      >
        <ArrowLeft size={13} /> Back
      </button>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-strong)]/60">
        <FolderTree size={14} className="text-[var(--accent)]" />
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          className="hover:text-[var(--text-strong)] transition cursor-pointer"
        >
          Reports
        </button>
        {trail.map((folder, index) => {
          const isLast = index === trail.length - 1;
          return (
            <span key={folder.id} className="flex items-center gap-1.5">
              <ChevronRight size={13} className="text-[var(--text-strong)]/30" />
              {isLast ? (
                <span className="text-[var(--text-strong)] font-bold">{folder.name}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(index)}
                  className="hover:text-[var(--text-strong)] transition cursor-pointer"
                >
                  {folder.name}
                </button>
              )}
            </span>
          );
        })}
      </span>
    </div>
  );
};
