import React from 'react';
import {
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
  Scale,
  Settings,
  Trash2,
  TrendingUp,
  Trophy,
  Truck,
  Users,
} from 'lucide-react';
import type { Role } from '../../types';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  roles: Role[];
}

export interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

export const MRF_NAV_ITEMS: NavItem[] = [
  { id: 'overview',       label: 'Overview',         icon: LayoutDashboard, roles: ['MRF'] },
  { id: 'dispatches',     label: 'Dispatches',       icon: Truck,           roles: ['MRF'] },
  { id: 'mrf-walkin',     label: 'Walk-in Station',  icon: Recycle,         roles: ['MRF'] },
  { id: 'mrf-direct',     label: 'Direct Pickup',    icon: PackageCheck,    roles: ['MRF'] },
  { id: 'mrf-assets',     label: 'Asset Ledger',     icon: FileSpreadsheet, roles: ['MRF'] },
  { id: 'mrf-scrap',      label: 'Scrap Stock',      icon: Trash2,          roles: ['MRF'] },
  { id: 'mrf-market',     label: 'Recycle Market',   icon: Scale,           roles: ['MRF'] },
  { id: 'mrf-history',    label: 'History',          icon: History,         roles: ['MRF'] },
];

export const ADMIN_SECTIONS = [
  {
    group: 'DATA & ANALYTICS',
    items: [
      { id: 'overview', label: 'Overview', icon: BarChart2 },
      { id: 'admin-impact', label: 'Operational Analytics', icon: TrendingUp },
      { id: 'admin-leaderboard', label: 'Leaderboard', icon: Trophy },
      { id: 'admin-ledger', label: 'School Years', icon: FileSpreadsheet },
    ],
  },
  {
    group: 'MANAGEMENT',
    items: [
      { id: 'admin-reports', label: 'Reports', icon: FileText },
      { id: 'admin-collections', label: 'Collections', icon: Scale },
      { id: 'admin-rewards', label: 'Rewards', icon: Gift },
      { id: 'admin-bin-map', label: 'Bin Map', icon: MapPin },
      { id: 'admin-campus-news', label: 'Campus News', icon: Newspaper },
    ],
  },
  {
    group: 'ADMINISTRATION',
    items: [
      { id: 'admin-users', label: 'Users', icon: Users },
      { id: 'admin-audit-logs', label: 'Audit Logs', icon: ClipboardList },
      { id: 'admin-settings', label: 'Settings', icon: Settings, hasSubmenu: true },
    ],
  },
];

export const SETTINGS_SUBITEMS = [
  { id: 'locations', label: 'Locations' },
  { id: 'academic-calendar', label: 'Academic Calendar' },
  { id: 'sync-integrations', label: 'Sync & Integrations' },
  { id: 'branding', label: 'Branding' },
  { id: 'asset-categories', label: 'Asset Categories' },
  { id: 'item-presets', label: 'Item Presets' },
  { id: 'points-system', label: 'Points System' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'waste-types', label: 'Waste Types' },
  { id: 'urgency-levels', label: 'Urgency Levels' },
  { id: 'asset-conditions', label: 'Asset Conditions' },
  { id: 'danger-zone', label: 'Danger Zone' },
];

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
