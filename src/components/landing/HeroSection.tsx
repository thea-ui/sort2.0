import React from 'react';
import { Leaf, ArrowRight, Users, Flame, Trophy, CheckCircle2 } from 'lucide-react';
import { useMockData } from '../../hooks/useMockData';
import { LoginCard } from './LoginCard';

interface HeroSectionProps {
  onNavigate: (route: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
  const { users, reports } = useMockData();
  const students = users.filter(u => u.role === 'STUDENT');
  const studentCount = students.length;
  const totalEcoPoints = students.reduce((sum, u) => sum + (u.points || 0), 0);
  const topReporter = students.reduce<(typeof students)[number] | null>(
    (best, u) => (best === null || (u.points || 0) > (best.points || 0) ? u : best),
    null
  );
  const resolvedCount = reports.filter(r => r.status === 'COLLECTED' || r.status === 'RESOLVED').length;

  // User-facing stats: what a student or teacher actually cares about.
  const TELEMETRY: Array<{
    icon: React.ComponentType<any>;
    value: string;
    label: string;
    trend: string;
    accent: string;
    valueClass?: string;
  }> = [
    {
      icon: Flame,
      value: totalEcoPoints.toLocaleString(),
      label: 'Eco-Points Earned',
      trend: 'This school year',
      accent: 'amber',
    },
    {
      icon: Trophy,
      value: topReporter ? topReporter.name.split(',')[0].trim().split(/\s+/)[0] : '—',
      label: 'Top Reporter',
      trend: topReporter ? `${(topReporter.points || 0).toLocaleString()} pts` : 'No reports yet',
      accent: 'violet',
      valueClass: 'text-lg',
    },
    {
      icon: CheckCircle2,
      value: String(resolvedCount),
      label: 'Reports Resolved',
      trend: 'Campus-wide',
      accent: 'emerald',
    },
    {
      icon: Users,
      value: String(studentCount),
      label: 'Active Students',
      trend: 'Joined',
      accent: 'sky',
    },
  ];

  const accentStyles: Record<string, { iconBg: string; iconText: string; badgeBg: string; badgeText: string }> = {
    emerald: { iconBg: 'bg-[var(--primary)]/10', iconText: 'text-[var(--primary)]', badgeBg: 'bg-[var(--primary)]/10', badgeText: 'text-[var(--primary)]' },
    violet: { iconBg: 'bg-[var(--gold)]/10', iconText: 'text-[var(--gold)]', badgeBg: 'bg-[var(--gold)]/10', badgeText: 'text-[var(--gold)]' },
    amber: { iconBg: 'bg-amber-50', iconText: 'text-amber-600', badgeBg: 'bg-amber-50', badgeText: 'text-amber-700' },
    sky: { iconBg: 'bg-[var(--primary)]/10', iconText: 'text-[var(--text-strong)]', badgeBg: 'bg-[var(--primary)]/10', badgeText: 'text-[var(--text-strong)]' },
  };

  return (
    <section className="relative overflow-hidden border-b border-[var(--primary)]/10 bg-[var(--background)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% -10%, rgba(var(--accent-rgb), 0.15), transparent)',
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/15 px-4 py-1.5 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--accent)]">
            Live Campus Monitoring System
          </span>
        </div>

        {/* 60/40 Split: Hero Content + Login Card */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-12">
          {/* Left 60%: Headline + CTAs */}
          <div className="lg:col-span-3">
            <h1 className="font-heading text-[48px] sm:text-[60px] lg:text-[72px] font-extrabold leading-[1.1] tracking-tight text-[var(--text-strong)]">
              Smarter Waste Recovery
              <br />
              <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--gold)] bg-clip-text text-transparent">
                for Every Campus.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--text-strong)]/80">
              S.O.R.T. automates waste tracking, gamifies eco-behavior, and connects students,
              teachers, and MRF teams in one unified operational platform.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="#login-card"
                className="group flex items-center gap-2 rounded-full bg-[var(--accent)] px-7 py-3.5 text-sm font-bold text-[var(--on-accent)] shadow-md shadow-[var(--accent)]/25 transition-all hover:bg-[var(--accent-dark)] cursor-pointer"
              >
                Access Dashboard
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#how-it-works"
                className="flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-white px-7 py-3.5 text-sm font-semibold text-[var(--text-strong)] shadow-xs transition-all hover:border-[var(--accent)] hover:bg-[var(--background)]"
              >
                <Leaf size={14} className="text-[var(--accent)]" />
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
                <p className={`mt-5 font-black tabular-nums text-gray-900 truncate ${m.valueClass ?? 'text-2xl'}`}>{m.value}</p>
                <p className="mt-1 text-[12px] font-semibold text-gray-700">{m.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
