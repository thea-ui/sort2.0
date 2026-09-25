import React from 'react';
import { FileText, Scale, ShieldCheck, Trophy } from 'lucide-react';
import { PortalLogin, type PortalLoginConfig } from '../../components/auth/PortalLogin';

interface AdminLoginProps {
  onNavigate: (route: string) => void;
}

const CONFIG: PortalLoginConfig = {
  portal: 'ADMIN',
  badge: 'ADMIN',
  badgeClassName: 'bg-[var(--gold)]',
  portalTitle: 'System Administration Portal',
  signInIcon: ShieldCheck,
  footerIcon: ShieldCheck,
  footerText: 'Administrative Access • Restricted Portal',
  features: [
    { icon: FileText, title: 'Reports & Dispatch', description: 'Verify campus reports and route MRF teams' },
    { icon: Scale, title: 'Collections & Revenue', description: 'Audit collected weight and recyclable sales' },
    { icon: Trophy, title: 'Leaderboard & Rewards', description: 'Manage eco-points, prizes and claims' },
    { icon: ShieldCheck, title: 'Users & Audit Logs', description: 'Control access and monitor activity' },
  ],
};

export const AdminLogin: React.FC<AdminLoginProps> = ({ onNavigate }) => (
  <PortalLogin config={CONFIG} onNavigate={onNavigate} />
);
