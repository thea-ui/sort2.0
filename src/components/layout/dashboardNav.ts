import {
  AlertTriangle,
  Award,
  BarChart2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Gift,
  History,
  LayoutDashboard,
  MapPin,
  Newspaper,
  PackageCheck,
  Recycle,
  RefreshCw,
  Scale,
  Settings,
  Trash2,
  TrendingUp,
  Trophy,
  Truck,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { Role } from '../../types';
import type { ShellNavGroup } from './AppShell';

export interface NavItem {
  id: string;
  label: string;
  icon: ComponentType<any>;
  roles: Role[];
}

export interface MobileNavItem {
  id: string;
  label: string;
  icon: ComponentType<any>;
}

/**
 * Settings destinations. Related screens are merged behind one entry with
 * internal section tabs (13 flat items was too noisy for the sidebar):
 *   School & Sync    -> Branding, Sync & Integrations, Academic Calendar
 *   Report Setup     -> Asset Categories, Item Presets, Waste Types,
 *                       Urgency Levels, Asset Conditions
 *   Points & Rewards -> Points System, Certificates, Challenges
 * Legacy ids (e.g. `branding`, `item-presets`) still resolve to the right page
 * and section in AdminSettingsTab, so old deep links keep working.
 */
export const SETTINGS_SUBITEMS = [
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'school-sync', label: 'School & Sync', icon: RefreshCw },
  { id: 'report-setup', label: 'Report Setup', icon: ClipboardList },
  { id: 'points-rewards', label: 'Points & Rewards', icon: Award },
  { id: 'danger-zone', label: 'Danger Zone', icon: AlertTriangle },
];

/** MRF terminal navigation, grouped for the collapsible sidebar. */
export const MRF_NAV_GROUPS: ShellNavGroup[] = [
  {
    title: 'OPERATIONS',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'dispatches', label: 'Dispatches', icon: Truck },
    ],
  },
  {
    title: 'MATERIAL RECOVERY',
    items: [
      { id: 'mrf-walkin', label: 'Walk-in Station', icon: Recycle },
      { id: 'mrf-direct', label: 'Direct Pickup', icon: PackageCheck },
    ],
  },
  {
    title: 'INVENTORY',
    items: [
      { id: 'mrf-assets', label: 'Asset Ledger', icon: FileSpreadsheet },
      { id: 'mrf-scrap', label: 'Scrap Stock', icon: Trash2 },
      { id: 'mrf-market', label: 'Recycle Market', icon: Scale },
    ],
  },
  {
    title: 'RECORDS',
    items: [{ id: 'mrf-history', label: 'History', icon: History }],
  },
];

/** Admin console navigation, grouped for the collapsible sidebar. */
export const ADMIN_NAV_GROUPS: ShellNavGroup[] = [
  {
    title: 'DATA & ANALYTICS',
    items: [
      { id: 'overview', label: 'Overview', icon: BarChart2 },
      { id: 'admin-impact', label: 'Operational Analytics', icon: TrendingUp },
      { id: 'admin-leaderboard', label: 'Leaderboard', icon: Trophy },
      { id: 'admin-ledger', label: 'School Years', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { id: 'admin-reports', label: 'Reports', icon: FileText },
      { id: 'admin-collections', label: 'Collections', icon: Scale },
      { id: 'admin-rewards', label: 'Rewards', icon: Gift },
      { id: 'admin-bin-map', label: 'Bin Map', icon: MapPin },
      { id: 'admin-campus-news', label: 'Campus News', icon: Newspaper },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { id: 'admin-users', label: 'Users', icon: Users },
      { id: 'admin-audit-logs', label: 'Audit Logs', icon: ClipboardList },
      { id: 'admin-settings', label: 'Settings', icon: Settings, children: SETTINGS_SUBITEMS },
    ],
  },
];

/** Flat MRF item list, kept for callers that only need id/label/icon/roles. */
export const MRF_NAV_ITEMS: NavItem[] = MRF_NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    roles: ['MRF'] as Role[],
  })),
);

/** Legacy section shape consumed by older navigation callers. */
export const ADMIN_SECTIONS = ADMIN_NAV_GROUPS.map((group) => ({
  group: group.title,
  items: group.items.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    hasSubmenu: Boolean(item.children),
  })),
}));

/** Tabs that are reachable programmatically but not listed in the sidebar. */
const PAGE_TITLE_ALIASES: Record<string, string> = {
  'admin-analytics': 'Overview',
  'admin-settings': 'Settings',
  'admin-warnings': 'Warnings & Offenses',
  'admin-sync': 'Sync Logs',
};

/** Human-readable page title for the topbar's two-line label stack. */
export function resolvePageTitle(activeTab: string, isMRF: boolean): string {
  const groups = isMRF ? MRF_NAV_GROUPS : ADMIN_NAV_GROUPS;

  for (const group of groups) {
    for (const item of group.items) {
      if (item.id === activeTab) return item.label;
      const child = item.children?.find((entry) => entry.id === activeTab);
      if (child) return child.label;
    }
  }

  return PAGE_TITLE_ALIASES[activeTab] ?? (isMRF ? 'MRF Terminal' : 'Admin Console');
}

/**
 * Bottom-bar destinations per role (short labels for narrow screens). Every
 * other destination stays reachable through the "More" sheet.
 */
export const MOBILE_PRIMARY_ITEMS: Record<'MRF' | 'ADMIN', MobileNavItem[]> = {
  MRF: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'dispatches', label: 'Dispatches', icon: Truck },
    { id: 'mrf-walkin', label: 'Walk-in', icon: Recycle },
    { id: 'mrf-scrap', label: 'Scrap', icon: Trash2 },
  ],
  ADMIN: [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'admin-reports', label: 'Reports', icon: FileText },
    { id: 'admin-collections', label: 'Collections', icon: Scale },
    { id: 'admin-users', label: 'Users', icon: Users },
  ],
};
