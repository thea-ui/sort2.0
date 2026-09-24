import { describe, expect, it } from 'vitest';
import { formatDateTime, formatShortDate, formatTime, toDateKey } from '../dateFormat';

describe('dateFormat', () => {
  it('returns an em-dash for null/invalid input', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatShortDate(undefined)).toBe('—');
    expect(formatTime('')).toBe('—');
    expect(toDateKey('not-a-date')).toBe('');
  });

  it('formats a stable local date key without UTC shift', () => {
    expect(toDateKey(new Date(2026, 8, 24, 23, 30))).toBe('2026-09-24');
    expect(toDateKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });

  it('formats valid dates and times', () => {
    const date = new Date(2026, 8, 24, 14, 5);
    expect(formatShortDate(date)).toContain('2026');
    expect(formatTime(date)).toMatch(/2:05/);
    expect(formatDateTime(date)).toContain('2026');
  });
});
