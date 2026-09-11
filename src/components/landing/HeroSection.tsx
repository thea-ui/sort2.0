import React from 'react';
import { Leaf, ArrowRight, Recycle, Users, Award, Truck, TrendingUp } from 'lucide-react';
import { useMockData } from '../../hooks/useMockData';
import { LoginCard } from './LoginCard';

interface HeroSectionProps {
  onNavigate: (route: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
  const { users, reports, bins } = useMockData();
  const studentCount = users.filter(u => u.role === 'STUDENT').length;
  const totalReports = reports.length;
  const totalKg = reports.reduce((sum, r) => sum + (r.weightCollected || 0), 0);
  const activeDispatches = bins.filter(b => b.activeDispatch).length;
  const pendingCount = reports.filter(r => r.status === 'PENDING').length;
  const resolvedCount = reports.filter(r => r.status === 'RESOLVED').length;

  const TELEMETRY = [
    { icon: Recycle, value: totalKg > 0 ? `${totalKg.toFixed(1)} kg` : '0 kg', label: 'Waste Recovered', trend: '+14% vs last week', accent: 'emerald' },
    { icon: Truck, value: String(activeDispatches), label: 'Active Dispatches', trend: `${pendingCount} pending`, accent: 'violet' },
    { icon: TrendingUp, value: `${Math.min(99, Math.round((resolvedCount / Math.max(totalReports, 1)) * 100))}/100`, label: 'Campus Eco-Score', trend: 'Healthy', accent: 'amber' },
    { icon: Users, value: studentCount > 0 ? `${studentCount}+` : '0', label: 'Active Participants', trend: 'Students', accent: 'sky' },
  ];

  const accentStyles: Record<string, { iconBg: string; iconText: string; badgeBg: string; badgeText: string }> = {
    emerald: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-600' },
    violet: { iconBg: 'bg-violet-50', iconText: 'text-violet-600', badgeBg: 'bg-violet-50', badgeText: 'text-violet-600' },
    amber: { iconBg: 'bg-amber-50', iconText: 'text-amber-600', badgeBg: 'bg-amber-50', badgeText: 'text-amber-700' },
    sky: { iconBg: 'bg-sky-50', iconText: 'text-sky-600', badgeBg: 'bg-sky-50', badgeText: 'text-sky-600' },
  };

  return (
    <section className="relative overflow-hidden border-b border-[#00271D]/10 bg-[#F9F3F0]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% -10%, rgba(0,167,124,0.15), transparent)',
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#00A77C]/40 bg-[#00A77C]/15 px-4 py-1.5 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-[#00A77C] animate-pulse" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#00A77C]">
            Live Campus Monitoring System
          </span>
        </div>

        {/* 60/40 Split: Hero Content + Login Card */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-12">
          {/* Left 60%: Headline + CTAs */}
          <div className="lg:col-span-3">
            <h1 className="font-heading text-[48px] sm:text-[60px] lg:text-[72px] font-extrabold leading-[1.1] tracking-tight text-[#00271D]">
              Smarter Waste Recovery
              <br />
              <span className="bg-gradient-to-r from-[#00A77C] to-[#33b996] bg-clip-text text-transparent">
                for Every Campus.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#00271D]/80">
              S.O.R.T. automates waste tracking, gamifies eco-behavior, and connects students,
              teachers, and MRF teams in one unified operational platform.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="#login-card"
                className="group flex items-center gap-2 rounded-full bg-[#00A77C] px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-[#00A77C]/25 transition-all hover:bg-[#008f6a] cursor-pointer"
              >
                Access Dashboard
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#how-it-works"
                className="flex items-center gap-2 rounded-full border border-[#00271D]/20 bg-white px-7 py-3.5 text-sm font-semibold text-[#00271D] shadow-xs transition-all hover:border-[#00A77C] hover:bg-[#F9F3F0]"
              >
                <Leaf size={14} className="text-[#00615F]" />
                How It Works
              </a>
            </div>
          </div>

          {/* Right 40%: Login Card */}
          <div className="lg:col-span-2">
            <LoginCard onAuthenticated={() => onNavigate('dashboard')} />
          </div>
        </div>

        {/* Telemetry Bento Ribbon */}
        <div className="mt-16 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TELEMETRY.map((m) => {
            const Icon = m.icon;
            const c = accentStyles[m.accent];
            return (
              <div
                key={m.label}
                className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/70 p-6 shadow-sm backdrop-blur-md transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg}`}>
                    <Icon size={18} className={c.iconText} strokeWidth={2} />
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${c.badgeBg} ${c.badgeText}`}>
                    {m.trend}
                  </span>
                </div>
                <p className="mt-5 text-2xl font-black tabular-nums text-gray-900">{m.value}</p>
                <p className="mt-1 text-[12px] font-semibold text-gray-700">{m.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
