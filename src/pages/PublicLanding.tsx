import React, { useRef } from 'react';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { HeroSection } from '../components/landing/HeroSection';
import { MetricsRow } from '../components/landing/MetricsRow';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { CampaignsFeed } from '../components/landing/CampaignsFeed';
import { LeaderboardCard } from '../components/landing/LeaderboardCard';
import { LoginCard } from '../components/landing/LoginCard';
import { RecentActivityFeed } from '../components/landing/RecentActivityFeed';
import { BinStatusWidget } from '../components/landing/BinStatusWidget';

interface PublicLandingProps {
  onNavigate: (route: string) => void;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({ onNavigate }) => {
  const loginRef = useRef<HTMLDivElement>(null);

  const scrollToLogin = () => {
    loginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <LandingHeader onNavigate={onNavigate} />
      <HeroSection scrollToLogin={scrollToLogin} />
      <MetricsRow />
      <FeaturesSection />

      {/* Main content area */}
      <div className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

            {/* LEFT COLUMN — content panels (2/3 width) */}
            <div className="flex flex-col gap-6 md:col-span-2">
              <RecentActivityFeed />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <CampaignsFeed />
                <BinStatusWidget />
              </div>
              <LeaderboardCard />
            </div>

            {/* RIGHT COLUMN — login card sticky (1/3 width) */}
            <div className="md:col-span-1">
              <div ref={loginRef} className="sticky top-20">
                <LoginCard onAuthenticated={() => onNavigate('dashboard')} />
              </div>
            </div>

          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
};
