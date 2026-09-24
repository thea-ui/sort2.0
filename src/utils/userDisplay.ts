import { User } from '../types';

/** Human-readable role labels shared by the profile menu and sidebar card. */
export const ROLE_LABELS: Record<User['role'], string> = {
  STUDENT: 'Student',
  TEACHER: 'Faculty',
  MRF: 'MRF Staff',
  ADMIN: 'System Administrator',
};

/** First letters of the first two name parts, e.g. "Rizal, Jose" -> "RJ". */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
