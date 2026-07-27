import React from 'react';
import { Leaf, ArrowRight, Recycle, Users, Award } from 'lucide-react';

interface HeroSectionProps {
  scrollToLogin: () => void;
}

const STATS = [
  { icon: Recycle, value: '1.2 tons', label: 'Waste Recovered This Year' },
  { icon: Users, value: '480+', label: 'Active Student Participants' },
  { icon: Award, value: '96', label: 'Eco Certificates Awarded' },
];

export const HeroSection: React.FC<HeroSectionProps> = ({ scrollToLogin }) => {
  return (
    <section className="relative overflow-hidden border-b border-gray-200 bg-white">
      {/* Subtle radial glow behind headline */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% -10%, rgba(16,185,129,0.07), transparent)',
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600">
            Live Campus Monitoring System
          </span>
        </div>

        {/* Headline */}
        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          Smarter Waste Recovery
          <br />
          <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
            for Every Campus.
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-500">
          S.O.R.T. automates waste tracking, gamifies eco-behavior, and connects students,
          teachers, and MRF teams in one unified operational platform.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={scrollToLogin}
            className="group flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-600"
          >
            Access Dashboard
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50"
          >
            <Leaf size={14} className="text-emerald-500" />
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
