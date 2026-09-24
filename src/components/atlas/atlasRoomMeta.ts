import {
  BookOpen,
  Briefcase,
  Building2,
  Dumbbell,
  FlaskConical,
  HelpCircle,
  Monitor,
  Utensils,
  Users,
} from 'lucide-react';
import type { AtlasRoom } from '../../types';

export interface RoomTypeMeta {
  label: string;
  badgeClass: string;
  icon: typeof BookOpen;
}

const DEFAULT_META: RoomTypeMeta = {
  label: 'Room',
  badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
  icon: HelpCircle,
};

export const ROOM_TYPE_META: Record<string, RoomTypeMeta> = {
  CLASSROOM: { label: 'Classroom', badgeClass: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25', icon: Monitor },
  LABORATORY: { label: 'Laboratory', badgeClass: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25', icon: FlaskConical },
  LIBRARY: { label: 'Library', badgeClass: 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/25', icon: BookOpen },
  FACULTY_ROOM: { label: 'Faculty Room', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Users },
  OFFICE: { label: 'Office', badgeClass: 'bg-amber-100 text-amber-900 border-amber-200', icon: Briefcase },
  CANTEEN: { label: 'Canteen', badgeClass: 'bg-orange-100 text-orange-800 border-orange-200', icon: Utensils },
  CAFETERIA: { label: 'Cafeteria', badgeClass: 'bg-orange-100 text-orange-800 border-orange-200', icon: Utensils },
  GYM: { label: 'Gym', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200', icon: Dumbbell },
  SPORTS: { label: 'Sports', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200', icon: Dumbbell },
  ADMIN: { label: 'Admin', badgeClass: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25', icon: Building2 },
};

export function roomTypeMeta(type: string | undefined | null): RoomTypeMeta {
  if (!type) return DEFAULT_META;
  return ROOM_TYPE_META[type.toUpperCase()] ?? DEFAULT_META;
}

/** Pick a readable label colour for an arbitrary ATLAS fill colour. */
export function readableTextColor(hex: string | null | undefined): string {
  const fallback = 'var(--primary)';
  if (!hex) return fallback;
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return fallback;

  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  // Relative luminance (sRGB approximation) — threshold tuned for label legibility.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? 'var(--primary)' : '#FFFFFF';
}

/**
 * Location string contract shared with the teacher report picker.
 * Must keep the `' – '` separator: TeacherSubmitReportTab splits on it.
 */
export function atlasRoomToLocationString(room: Pick<AtlasRoom, 'name'>, buildingName: string): string {
  return `${room.name} – ${buildingName}`;
}
