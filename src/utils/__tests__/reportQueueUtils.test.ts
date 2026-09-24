import { describe, expect, it } from 'vitest';
import type { Report } from '../../types';
import {
  computeOffenseSeverity,
  filterQueueReports,
  getCategoryLabel,
  getQueueReportTimeMs,
  groupReportsByLocation,
  isAssetReport,
  isSameLocalDay,
} from '../reportQueueUtils';

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'rep-1',
    title: 'Waste Report',
    description: 'Plastic bottles',
    locationName: 'Canteen',
    category: 'RECYCLABLE',
    status: 'PENDING',
    reportType: 'WASTE',
    reporterName: 'Student One',
    timestamp: new Date().toISOString(),
    isVerified: false,
    ...overrides,
  } as Report;
}

describe('getQueueReportTimeMs', () => {
  it('parses ISO timestamps', () => {
    const ms = getQueueReportTimeMs({ id: 'x', timestamp: '2026-01-02T03:04:05Z' });
    expect(ms).toBe(new Date('2026-01-02T03:04:05Z').getTime());
  });

  it('falls back to the rep-<n> id when the timestamp is unusable', () => {
    expect(getQueueReportTimeMs({ id: 'rep-42', timestamp: '' })).toBe(42);
  });

  it('returns 0 when neither source works', () => {
    expect(getQueueReportTimeMs({ id: 'abc', timestamp: 'not-a-date' })).toBe(0);
  });
});

describe('isAssetReport', () => {
  it('trusts the ASSET report type', () => {
    expect(isAssetReport({ reportType: 'ASSET', description: '' })).toBe(true);
  });

  it('detects asset pillar tags in the description', () => {
    expect(
      isAssetReport({ reportType: 'WASTE', description: '[Pillar: FURNITURE] broken chair' }),
    ).toBe(true);
  });

  it('rejects plain waste reports', () => {
    expect(isAssetReport({ reportType: 'WASTE', description: 'Plastic bottles' })).toBe(false);
  });
});

describe('computeOffenseSeverity', () => {
  it('escalates with prior warning count', () => {
    expect(computeOffenseSeverity(0)).toBe('WARNING');
    expect(computeOffenseSeverity(1)).toBe('DEDUCT');
    expect(computeOffenseSeverity(2)).toBe('SUSPENSION');
    expect(computeOffenseSeverity(9)).toBe('SUSPENSION');
  });
});

describe('isSameLocalDay', () => {
  it('accepts a timestamp from today', () => {
    expect(isSameLocalDay(new Date().toISOString())).toBe(true);
  });

  it('rejects invalid or empty input', () => {
    expect(isSameLocalDay(undefined)).toBe(false);
    expect(isSameLocalDay('garbage')).toBe(false);
  });

  it('rejects an old timestamp', () => {
    expect(isSameLocalDay('2001-01-01T00:00:00Z')).toBe(false);
  });
});

describe('filterQueueReports', () => {
  it('hides EXPIRED reports regardless of filters', () => {
    const rows = filterQueueReports([makeReport({ status: 'EXPIRED' })], {
      activeFilter: 'ALL',
      searchQuery: '',
      statusFilter: 'ALL',
    });
    expect(rows).toHaveLength(0);
  });

  it('splits waste and asset scopes', () => {
    const waste = makeReport({ id: 'rep-1' });
    const asset = makeReport({
      id: 'rep-2',
      reportType: 'ASSET',
      description: '[Pillar: FURNITURE] chair',
    });
    expect(
      filterQueueReports([waste, asset], { activeFilter: 'WASTE', searchQuery: '', statusFilter: 'ALL' }),
    ).toHaveLength(1);
    expect(
      filterQueueReports([waste, asset], { activeFilter: 'ASSET', searchQuery: '', statusFilter: 'ALL' }),
    ).toHaveLength(1);
  });

  it('applies search across title, location and reporter', () => {
    const report = makeReport({ locationName: 'Gymnasium' });
    expect(
      filterQueueReports([report], { activeFilter: 'ALL', searchQuery: 'gym', statusFilter: 'ALL' }),
    ).toHaveLength(1);
    expect(
      filterQueueReports([report], { activeFilter: 'ALL', searchQuery: 'nope', statusFilter: 'ALL' }),
    ).toHaveLength(0);
  });

  it('sorts newest first', () => {
    const older = makeReport({ id: 'rep-1', timestamp: '2026-01-01T00:00:00Z', status: 'DISPATCHED' });
    const newer = makeReport({ id: 'rep-2', timestamp: '2026-02-01T00:00:00Z', status: 'DISPATCHED' });
    const rows = filterQueueReports([older, newer], {
      activeFilter: 'ALL',
      searchQuery: '',
      statusFilter: 'ALL',
    });
    expect(rows[0].id).toBe('rep-2');
  });
});

describe('groupReportsByLocation', () => {
  it('groups by location + category and counts activity', () => {
    const groups = groupReportsByLocation([
      makeReport({ id: 'rep-1', locationName: 'Canteen', status: 'PENDING' }),
      makeReport({ id: 'rep-2', locationName: 'Canteen', status: 'COLLECTED' }),
      makeReport({ id: 'rep-3', locationName: 'Gym', category: 'HAZARDOUS' }),
    ]);
    expect(groups).toHaveLength(2);
    const canteen = groups.find((g) => g.locationName === 'Canteen');
    expect(canteen?.reports).toHaveLength(2);
    expect(canteen?.activeCount).toBe(1);
    expect(canteen?.completedCount).toBe(1);
  });
});

describe('getCategoryLabel', () => {
  it('maps known categories and falls back', () => {
    expect(getCategoryLabel('RECYCLABLE')).toBe('Recyclable');
    expect(getCategoryLabel('HAZARDOUS')).toBe('Hazardous');
    expect(getCategoryLabel(undefined)).toBe('Non-Biodegradable');
  });
});
