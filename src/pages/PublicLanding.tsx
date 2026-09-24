import React from 'react';
import { LandingHeader } from '../components/landing/LandingHeader';
import { LandingFooter } from '../components/landing/LandingFooter';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { CampaignsFeed } from '../components/landing/CampaignsFeed';
import { LeaderboardCard } from '../components/landing/LeaderboardCard';
import { HowItWorksTimeline } from '../components/landing/HowItWorksTimeline';

interface PublicLandingProps {
  onNavigate: (route: string) => void;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[var(--background)] font-sans text-[#012625]">
      <LandingHeader onNavigate={onNavigate} />

      {/* TIER 1: THE COMMAND HERO (60/40 Split) */}
      <HeroSection onNavigate={onNavigate} />

      {/* TIER 2: ASYMMETRICAL PLATFORM CAPABILITIES */}
      <FeaturesSection />

      {/* TIER 3: THE COMMUNITY & LOGISTICS HUB (60/40 Split) */}
      <section className="bg-[var(--background)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* LEFT: Campus Hall of Fame (60%) */}
            <div className="lg:col-span-3">
              <LeaderboardCard />
            </div>

            {/* RIGHT: Upcoming Campaigns (40%) */}
            <div className="lg:col-span-2">
              <CampaignsFeed />
            </div>
          </div>
        </div>
      </section>

      {/* TIER 4: WORKFLOW STRIP ("HOW SORT WORKS") */}
      <HowItWorksTimeline />

      <LandingFooter />
    </div>
  );
};
