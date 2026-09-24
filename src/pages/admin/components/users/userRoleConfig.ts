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
    bg: 'bg-[var(--gold)]/10',
    border: 'border-[var(--gold)]/30',
    text: 'text-[var(--gold)]',
    icon: ShieldCheck,
    badgeBg: 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/25',
    accent: 'text-[var(--gold)]',
    gradient: 'from-[var(--gold)] to-[var(--gold)]',
  },
  MRF: {
    label: 'MRF Logistics',
    bg: 'bg-[var(--primary)]/10',
    border: 'border-[var(--primary)]/30',
    text: 'text-[var(--text-strong)]',
    icon: Truck,
    badgeBg: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25',
    accent: 'text-[var(--text-strong)]',
    gradient: 'from-[var(--primary)] to-[var(--primary)]',
  },
  TEACHER: {
    label: 'Faculty Advisor',
    bg: 'bg-[var(--gold)]/10',
    border: 'border-[var(--gold)]/30',
    text: 'text-[var(--gold)]',
    icon: Building2,
    badgeBg: 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/25',
    accent: 'text-[var(--gold)]',
    gradient: 'from-[var(--gold)] to-[var(--gold)]',
  },
  STUDENT: {
    label: 'Student Eco-Rep',
    bg: 'bg-[var(--accent)]/10',
    border: 'border-[var(--accent)]/30',
    text: 'text-[var(--accent)]',
    icon: GraduationCap,
    badgeBg: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20',
    accent: 'text-[var(--accent)]',
    gradient: 'from-[var(--accent)] to-[var(--accent-darker)]',
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
