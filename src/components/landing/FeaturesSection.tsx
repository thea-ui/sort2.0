import React from 'react';
import { Zap, Shield, BarChart3, Users, Leaf, MapPin } from 'lucide-react';

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Live Waste Analytics',
    description:
      'Real-time dashboards track bin fill levels, dispatch statuses, and campus-wide recovery metrics across all zones.',
    accent: 'emerald',
  },
  {
    icon: Zap,
    title: 'Gamified Eco-Points',
    description:
      'Students and teachers earn points for every verified waste report, unlocking certificates and climbing the campus leaderboard.',
    accent: 'amber',
  },
  {
    icon: MapPin,
    title: 'Bin & Zone Monitoring',
    description:
      'Interactive bin status maps let staff monitor fill levels at a glance and dispatch MRF teams precisely when needed.',
    accent: 'violet',
  },
  {
    icon: Shield,
    title: 'Role-Based Access Control',
    description:
      'Students, teachers, MRF operators, and admins each get tailored views and permissions — all pre-provisioned securely.',
    accent: 'sky',
  },
  {
    icon: Users,
    title: 'Classroom Compliance Audits',
    description:
      'Teachers can run waste compliance checks per classroom section and flag offenses for administrative review.',
    accent: 'rose',
  },
  {
    icon: Leaf,
    title: 'Eco Campaigns & Events',
    description:
      'School-wide clean-up drives, collection schedules, and maintenance windows are published and tracked in one unified calendar.',
    accent: 'teal',
  },
];

const ACCENT_STYLES: Record<string, { bg: string; icon: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   ring: 'ring-amber-100' },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  ring: 'ring-violet-100' },
  sky:     { bg: 'bg-sky-50',     icon: 'text-sky-600',     ring: 'ring-sky-100' },
  rose:    { bg: 'bg-rose-50',    icon: 'text-rose-600',    ring: 'ring-rose-100' },
  teal:    { bg: 'bg-teal-50',    icon: 'text-teal-600',    ring: 'ring-teal-100' },
};

export const FeaturesSection: React.FC = () => {
  return (
    <section id="how-it-works" className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Section header */}
        <div className="mb-12 max-w-lg">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            Platform Capabilities
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            Everything you need to run a
            <br />
            <span className="text-gray-400">zero-waste campus program.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            const s = ACCENT_STYLES[f.accent];
            return (
              <div
                key={f.title}
                className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
              >
                <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${s.bg} ${s.ring}`}>
                  <Icon size={17} className={s.icon} strokeWidth={1.8} />
                </div>
                <h3 className="mb-2 text-sm font-bold text-gray-900">{f.title}</h3>
                <p className="text-[12px] leading-relaxed text-gray-500">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
