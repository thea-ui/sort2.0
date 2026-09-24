import React from 'react';
import { ShieldCheck, Truck } from 'lucide-react';
import { SortLogo } from '../common/SortLogo';

interface LandingHeaderProps {
  onNavigate: (route: string) => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ onNavigate }) => {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Brand */}
        <SortLogo size={48} subtitle="Smart Operational Recovery & Tracking" />

        {/* Right nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('admin-login')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-800"
          >
            <ShieldCheck size={13} strokeWidth={2} />
            <span className="hidden sm:inline">Admin Portal</span>
          </button>
          <button
            onClick={() => onNavigate('mrf-login')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-800"
          >
            <Truck size={13} strokeWidth={2} />
            <span className="hidden sm:inline">MRF Terminal</span>
          </button>
          <div className="mx-2 h-4 w-px bg-gray-200" />
          <button
            onClick={() =>
              document.getElementById('login-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[11px] font-bold text-[var(--on-accent)] shadow-sm transition-all hover:bg-[var(--accent-dark)]"
          >
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
};
