import React from 'react';
import { Leaf, ShieldCheck, Truck } from 'lucide-react';

interface LandingHeaderProps {
  onNavigate: (route: string) => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ onNavigate }) => {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 shadow-sm shadow-emerald-200">
            <Leaf size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-bold tracking-tight text-gray-900">S.O.R.T</span>
            <span className="hidden text-[11px] font-medium text-gray-400 sm:block">
              Smart Operational Recovery & Tracking
            </span>
          </div>
        </div>

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
            className="rounded-lg bg-emerald-500 px-4 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-emerald-600"
          >
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
};
