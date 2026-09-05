import React from 'react';
import { Leaf, ArrowRight, Recycle, Users, Award } from 'lucide-react';
import { useMockData } from '../../hooks/useMockData';

interface HeroSectionProps {
  scrollToLogin: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ scrollToLogin }) => {
  const { users, reports } = useMockData();
  const studentCount = users.filter(u => u.role === 'STUDENT').length;
  const totalReports = reports.length;
  const totalKg = reports.reduce((sum, r) => sum + (r.weightCollected || 0), 0);

  const STATS = [
    { icon: Recycle, value: totalKg > 0 ? `${(totalKg / 1000).toFixed(1)} tons` : '0 kg', label: 'Waste Recovered' },
    { icon: Users, value: studentCount > 0 ? `${studentCount}+` : '0', label: 'Active Students' },
    { icon: Award, value: String(totalReports), label: 'Reports Submitted' },
  ];
  return (
    <section className="relative overflow-hidden border-b border-[#00271D]/10 bg-[#F9F3F0]">
      {/* Subtle radial glow behind headline */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% -10%, rgba(0,167,124,0.15), transparent)',
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#00A77C]/40 bg-[#00A77C]/15 px-4 py-1.5 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-[#00A77C] animate-pulse" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#00A77C]">
            Live Campus Monitoring System
          </span>
        </div>

        {/* Headline */}
        <h1 className="max-w-3xl font-heading text-[48px] sm:text-[60px] lg:text-[72px] font-extrabold leading-[1.1] tracking-tight text-[#00271D]">
          Smarter Waste Recovery
          <br />
          <span className="bg-gradient-to-r from-[#00A77C] to-[#33b996] bg-clip-text text-transparent">
            for Every Campus.
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-[#00271D]/80">
          S.O.R.T. automates waste tracking, gamifies eco-behavior, and connects students,
          teachers, and MRF teams in one unified operational platform.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={scrollToLogin}
            className="group flex items-center gap-2 rounded-full bg-[#00A77C] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#00A77C]/25 transition-all hover:bg-[#008f6a] cursor-pointer"
          >
            Access Dashboard
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 rounded-full border border-[#00271D]/20 bg-white px-6 py-3 text-sm font-semibold text-[#00271D] shadow-xs transition-all hover:border-[#00A77C] hover:bg-[#F9F3F0]"
          >
            <Leaf size={14} className="text-[#00615F]" />
            How It Works
          </a>
        </div>

        {/* Stats row */}
        <div className="mt-14 grid grid-cols-1 gap-px rounded-2xl border border-gray-200 bg-gray-200 shadow-sm sm:grid-cols-3">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-4 bg-white px-6 py-5 first:rounded-tl-2xl first:rounded-bl-2xl last:rounded-tr-2xl last:rounded-br-2xl sm:first:rounded-tr-none sm:first:rounded-bl-2xl sm:last:rounded-bl-none sm:last:rounded-tr-2xl"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
                  <Icon size={18} className="text-emerald-600" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-xl font-black tabular-nums text-gray-900">{s.value}</p>
                  <p className="text-[11px] text-gray-500">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
