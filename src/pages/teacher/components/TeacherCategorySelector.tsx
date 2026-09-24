import React from 'react';
import { InfrastructurePillar, CATEGORY_DETAILS } from './teacherReportData';

interface TeacherCategorySelectorProps {
  pillarMeta: Record<InfrastructurePillar, { emoji?: string; label: string; desc: string }>;
  onSelect: (cat: InfrastructurePillar) => void;
}

export const TeacherCategorySelector: React.FC<TeacherCategorySelectorProps> = ({ pillarMeta, onSelect }) => (
  <div className="space-y-6">
    <div className="bg-gradient-to-br from-white/95 via-white/90 to-[var(--primary)]/5 border border-white/90 rounded-3xl p-7 shadow-xl shadow-[var(--primary)]/5 backdrop-blur-md">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-3.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--accent)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
        Faculty Service Portal
      </span>
      <h2 className="mt-2 text-2xl font-heading font-black tracking-tight text-[var(--text-strong)]">
        Multi-Category Asset & Waste Report
      </h2>
      <p className="mt-1 text-xs text-[var(--text-strong)]/60 font-medium">
        File structural maintenance tickets, broken classroom items, or bin overflow reports directly to MRF staff.
      </p>
    </div>

    <div className="rounded-3xl border border-white/80 bg-white/90 backdrop-blur-md p-7 shadow-sm space-y-4">
      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-strong)]/60">
        1. Select Recovery Category
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(Object.entries(pillarMeta) as [InfrastructurePillar, typeof pillarMeta.waste][]).map(([id, meta]) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200/80 bg-white p-5 text-center transition-all hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 hover:shadow-md cursor-pointer select-none"
          >
            <span className="text-2xl">{meta.emoji}</span>
            <span className="text-sm font-bold text-[var(--text-strong)]">{meta.label}</span>
            <span className="text-[10px] text-[var(--text-strong)]/50 font-medium">{meta.desc}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);
