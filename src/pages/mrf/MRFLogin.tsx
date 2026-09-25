import React from 'react';
import { FileSpreadsheet, LogIn, PackageCheck, Recycle, Scale } from 'lucide-react';
import { PortalLogin, type PortalLoginConfig } from '../../components/auth/PortalLogin';

interface MRFLoginProps {
  onNavigate: (route: string) => void;
}

const CONFIG: PortalLoginConfig = {
  portal: 'MRF',
  badge: 'MRF',
  badgeClassName: 'bg-[var(--impact)]',
  portalTitle: 'Materials Recovery Facility Portal',
  signInIcon: LogIn,
  footerIcon: Recycle,
  footerText: 'Materials Recovery • Operations Terminal',
  features: [
    { icon: Recycle, title: 'Walk-in Station', description: 'Log bottle turn-ins and award eco-points' },
    { icon: PackageCheck, title: 'Direct Pickup', description: 'Record on-site recovery collections' },
    { icon: FileSpreadsheet, title: 'Asset Ledger', description: 'Track recovered materials and equipment' },
    { icon: Scale, title: 'Recycle Market', description: 'Sell recovered materials and log revenue' },
  ],
};

export const MRFLogin: React.FC<MRFLoginProps> = ({ onNavigate }) => (
  <PortalLogin config={CONFIG} onNavigate={onNavigate} />
);
