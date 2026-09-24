import React from 'react';
import { SortLogo } from '../common/SortLogo';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="relative border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div className="space-y-2.5">
            <SortLogo size={28} showText={true} />
            <p className="max-w-[220px] text-[11px] leading-relaxed text-gray-400">
              Smart Operational Recovery & Tracking — campus ecological waste management platform.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-x-16 gap-y-4 sm:gap-x-24">
            <div>
              <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-gray-400">Platform</p>
              <div className="space-y-2.5">
                {['Dashboard', 'Leaderboard', 'Eco Reports', 'MRF Terminal'].map((l) => (
                  <p key={l} className="cursor-default text-[11px] text-gray-500 transition-colors hover:text-gray-800">{l}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-gray-400">School</p>
              <div className="space-y-2.5">
                {['Admin Portal', 'Staff Gate', 'Eco Policy', 'Contact IT'].map((l) => (
                  <p key={l} className="cursor-default text-[11px] text-gray-500 transition-colors hover:text-gray-800">{l}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-6 sm:flex-row">
          <p className="text-[10px] text-gray-400">
            © {new Date().getFullYear()} S.O.R.T Campus Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">
              System Online
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
