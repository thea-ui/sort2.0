import { describe, expect, it } from 'vitest';
import { isTerminalReport, isDispatchableStreamMember, TERMINAL_REPORT_STATUSES } from '../reportUtils';
import type { Report, ReportStatus } from '../../types';

function report(partial: Partial<Report> & { status: ReportStatus }): Report {
  return {
    id: 'rep-1',
    title: 'Recyclable',
    description: '',
    urgency: 'LOW',
    category: 'RECYCLABLE',
    coordinates: { lat: 0, lng: 0 },
    locationName: 'G7 Room 303',
    reporterId: 'user-1',
    reporterName: 'Test Reporter',
    pointsAwarded: 0,
    timestamp: '2026-09-19T12:00:00.000Z',
    ...partial,
  };
}

describe('isTerminalReport', () => {
  it('treats finished reports as terminal', () => {
    for (const status of TERMINAL_REPORT_STATUSES) {
      expect(isTerminalReport(report({ status }))).toBe(true);
    }
  });

  it('treats active reports as non-terminal', () => {
    expect(isTerminalReport(report({ status: 'PENDING' }))).toBe(false);
    expect(isTerminalReport(report({ status: 'DISPATCHED' }))).toBe(false);
  });
});

describe('isDispatchableStreamMember (dispatch regression)', () => {
  const target = report({ id: 'new-report', locationName: 'G7 Room 303', category: 'RECYCLABLE', status: 'PENDING' });

  it('allows the target and its active stream siblings', () => {
    expect(isDispatchableStreamMember(target, target)).toBe(true);
    expect(
      isDispatchableStreamMember(
        report({ id: 'sibling', locationName: 'g7 room 303', category: 'RECYCLABLE', status: 'PENDING' }),
        target
      )
    ).toBe(true);
  });

  it('never re-opens a completed report in the same stream', () => {
    const completed = report({
      id: 'old-collected',
      locationName: 'G7 Room 303',
      category: 'RECYCLABLE',
      status: 'COLLECTED',
    });
    expect(isDispatchableStreamMember(completed, target)).toBe(false);
  });

  it('never re-opens a resolved, dismissed, or expired report in the same stream', () => {
    for (const status of ['RESOLVED', 'DISMISSED', 'EXPIRED'] as ReportStatus[]) {
      expect(
        isDispatchableStreamMember(
          report({ id: 'old', locationName: 'G7 Room 303', category: 'RECYCLABLE', status }),
          target
        )
      ).toBe(false);
    }
  });

  it('ignores reports from other streams', () => {
    expect(
      isDispatchableStreamMember(
        report({ id: 'other', locationName: 'G8 Building', category: 'RECYCLABLE', status: 'PENDING' }),
        target
      )
    ).toBe(false);
    expect(
      isDispatchableStreamMember(
        report({ id: 'other-cat', locationName: 'G7 Room 303', category: 'HAZARDOUS', status: 'PENDING' }),
        target
      )
    ).toBe(false);
  });
});
