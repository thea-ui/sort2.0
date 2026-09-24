import React from 'react';
import { Warehouse, Radio, FileCheck, Award, BarChart3 } from 'lucide-react';

const ROW1_LEFT = {
  icon: FileCheck,
  title: 'Student Bin Reporting',
  description: 'A mobile-friendly interface for students to submit real-time reports of overflowing bins — complete with photos and tagged campus locations for instant MRF notification. Each report is auto-categorized by waste type and routed to the nearest available MRF team.',
  accent: 'amber',
};

const ROW1_RIGHT = {
  icon: Award,
  title: 'Point-Based Certificate Recognition',
  description: 'Valid student reports earn non-redeemable participation points. At milestone tiers, the system auto-generates downloadable PDF Certificates of Recognition each semester.',
  accent: 'emerald',
};

const ROW2 = [
  { icon: Warehouse, title: 'MRF Operations & Material Recovery', description: 'MRF personnel manage daily recovery activities — logging collected materials by type, tracking inventory levels, and computing waste diversion rates.', accent: 'sky' },
  { icon: Radio, title: 'Bin Monitoring & Staff Dispatch', description: 'Live visualization of bin statuses across campus. MRF staff receive real-time alerts with location data, enabling immediate dispatch for clearance.', accent: 'violet' },
  { icon: BarChart3, title: 'Residual Waste Monitoring', description: 'Tracks residual (non-biodegradable) waste by volume and weight, per station and per week, so the school can document what is routed to disposal alongside what is recovered.', accent: 'rose' },
];

const ACCENT_STYLES: Record<string, { bg: string; icon: string; ring: string }> = {
  emerald: { bg: 'bg-[var(--primary)]/10', icon: 'text-[var(--primary)]', ring: 'ring-[var(--primary)]/25' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   ring: 'ring-amber-100' },
  violet:  { bg: 'bg-[var(--gold)]/10',  icon: 'text-[var(--gold)]',  ring: 'ring-[var(--gold)]/30' },
  sky:     { bg: 'bg-[var(--primary)]/10',     icon: 'text-[var(--text-strong)]',     ring: 'ring-[var(--primary)]/30' },
  rose:    { bg: 'bg-rose-50',    icon: 'text-rose-600',    ring: 'ring-rose-100' },
};

export const FeaturesSection: React.FC = () => {
  const renderCard = (f: { icon: React.ComponentType<any>; title: string; description: string; accent: string }, className = '') => {
    const Icon = f.icon;
    const s = ACCENT_STYLES[f.accent];
    return (
      <div key={f.title} className={`group flex flex-col rounded-2xl border border-gray-200 bg-white p-7 shadow-sm transition-all hover:shadow-md ${className}`}>
        <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${s.bg} ${s.ring}`}>
          <Icon size={18} className={s.icon} strokeWidth={1.8} />
        </div>
        <h3 className="mb-3 text-base font-bold text-gray-900">{f.title}</h3>
        <p className="text-[13px] leading-relaxed text-gray-500">{f.description}</p>
      </div>
    );
  };

  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        {/* Section header */}
        <div className="mb-14 max-w-lg">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
            Platform Capabilities
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            Everything you need to run a
            <br />
            <span className="text-gray-400">zero-waste campus program.</span>
          </h2>
        </div>

        {/* Bento Grid: Row1 (8/4 split) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Row1 Left — Wide8-col card */}
          <div className="lg:col-span-8">
            {renderCard(ROW1_LEFT)}
          </div>
          {/* Row1 Right —4-col card */}
          <div className="lg:col-span-4">
            {renderCard(ROW1_RIGHT)}
          </div>
        </div>

        {/* Bento Grid: Row2 (3 equal cards) */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ROW2.map((f) => renderCard(f))}
        </div>
      </div>
    </section>
  );
};
