import React from 'react';
import {
  BookOpen,
  Building2,
  ClipboardList,
  Crown,
  GraduationCap,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react';
import { Role } from '../../../../types';

export const ROLE_ORDER: Record<Role, number> = {
  ADMIN: 1,
  MRF: 2,
  TEACHER: 3,
  STUDENT: 4,
};

export const ROLE_CONFIG: Record<
  Role,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    icon: React.ElementType;
    badgeBg: string;
    accent: string;
    gradient: string;
  }
> = {
  ADMIN: {
    label: 'Administrator',
    bg: 'bg-[var(--ramp-4)]/10',
    border: 'border-[var(--ramp-4)]/25',
    text: 'text-[var(--ramp-4-strong)]',
    icon: ShieldCheck,
    badgeBg:
      'bg-[var(--ramp-4)]/10 text-[var(--ramp-4-strong)] border-[var(--ramp-4)]/25',
    accent: 'text-[var(--ramp-4-strong)]',
    gradient: 'from-[var(--ramp-4)] to-[var(--ramp-4-strong)]',
  },
  MRF: {
    label: 'MRF Logistics',
    bg: 'bg-[var(--ramp-2)]/10',
    border: 'border-[var(--ramp-2)]/25',
    text: 'text-[var(--ramp-2-strong)]',
    icon: Truck,
    badgeBg:
      'bg-[var(--ramp-2)]/10 text-[var(--ramp-2-strong)] border-[var(--ramp-2)]/25',
    accent: 'text-[var(--ramp-2-strong)]',
    gradient: 'from-[var(--ramp-2)] to-[var(--ramp-2-strong)]',
  },
  TEACHER: {
    label: 'Faculty Advisor',
    bg: 'bg-[var(--ramp-3)]/10',
    border: 'border-[var(--ramp-3)]/25',
    text: 'text-[var(--ramp-3-strong)]',
    icon: Building2,
    badgeBg:
      'bg-[var(--ramp-3)]/10 text-[var(--ramp-3-strong)] border-[var(--ramp-3)]/25',
    accent: 'text-[var(--ramp-3-strong)]',
    gradient: 'from-[var(--ramp-3)] to-[var(--ramp-3-strong)]',
  },
  STUDENT: {
    label: 'Student Eco-Rep',
    bg: 'bg-[var(--ramp-1)]/10',
    border: 'border-[var(--ramp-1)]/25',
    text: 'text-[var(--ramp-1-strong)]',
    icon: GraduationCap,
    badgeBg:
      'bg-[var(--ramp-1)]/10 text-[var(--ramp-1-strong)] border-[var(--ramp-1)]/25',
    accent: 'text-[var(--ramp-1-strong)]',
    gradient: 'from-[var(--ramp-1)] to-[var(--ramp-1-strong)]',
  },
};

export const ROLE_PERMISSIONS: Record<
  Role,
  { title: string; icon: React.ElementType; items: string[] }
> = {
  ADMIN: {
    title: 'System Access',
    icon: Crown,
    items: ['Full system configuration', 'User & role management', 'Audit log review', 'Platform-wide analytics'],
  },
  MRF: {
    title: 'Operations Access',
    icon: Wrench,
    items: ['Collection dispatch', 'Waste bin monitoring', 'Route management', 'Weight logging'],
  },
  TEACHER: {
    title: 'Faculty Access',
    icon: BookOpen,
    items: ['Class section oversight', 'Student report review', 'Program participation', 'Achievement tracking'],
  },
  STUDENT: {
    title: 'Eco-Rep Access',
    icon: ClipboardList,
    items: ['Submit waste reports', 'Earn eco-points', 'Claim certificates', 'View leaderboard rank'],
  },
};

/** Grade/section label for a user row, falling back to classroom section. */
export function getUserSectionLabel(user: any): string | null {
  if (user.gradeLevel) return `${user.gradeLevel} — ${user.sectionName || '—'}`;
  if (user.classroomSection) return user.classroomSection;
  return null;
}
