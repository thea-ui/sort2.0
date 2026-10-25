import React from 'react';
import { type PillarMeta } from './teacherReportData';

interface TeacherCategorySelectorProps {
  pillarMeta: Record<string, PillarMeta>;
  onSelect: (cat: string) => void;
}

export const TeacherCategorySelector: React.FC<TeacherCategorySelectorProps> = ({ pillarMeta, onSelect }) => (
  <div className="w-full space-y-4 sm:space-y-5">
    <div className="rounded-2xl border border-[var(--primary)]/10 bg-white px-4 py-4 sm:px-6 sm:py-5">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--accent)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        Faculty Service Portal
      </span>
      <h2 className="mt-2 text-lg font-heading font-black tracking-tight text-[var(--text-strong)] sm:text-xl">
        Multi-Category Asset &amp; Waste Report
      </h2>
      <p className="mt-1 max-w-3xl text-[11px] font-medium leading-relaxed text-[var(--text-strong)]/55 sm:text-xs">
        File structural maintenance tickets, broken classroom items, or bin overflow reports directly to MRF staff.
      </p>
    </div>

    <div className="space-y-4 rounded-2xl border border-[var(--primary)]/10 bg-white p-4 sm:p-5">
      <label className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--text-strong)]/50">
        1. Select Recovery Category
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(Object.entries(pillarMeta) as [string, PillarMeta][]).map(([id, meta]) => {
          const Icon = meta.icon;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className="group flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-xl border border-[var(--primary)]/10 bg-white p-4 text-center transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 cursor-pointer select-none"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                <Icon size={18} />
              </span>
              <span className="text-xs font-bold text-[var(--text-strong)] sm:text-sm">{meta.label}</span>
              <span className="text-[10px] font-medium leading-snug text-[var(--text-strong)]/50">{meta.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);
