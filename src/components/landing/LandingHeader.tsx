import React from 'react';
import { SortLogo } from '../common/SortLogo';

export const LandingHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <SortLogo size={48} subtitle="Smart Operational Recovery & Tracking" />
      </div>
    </header>
  );
};
