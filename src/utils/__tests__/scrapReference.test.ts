import { describe, expect, it } from 'vitest';
import { generateScrapApprovalReference } from '../scrapReference';

const at = new Date(2026, 8, 29);

describe('generateScrapApprovalReference', () => {
  it('starts the yearly series at 001 when nothing exists', () => {
    expect(generateScrapApprovalReference([], at)).toBe('WMR-2026-001');
  });

  it('continues past the highest sequence in the same year', () => {
    expect(
      generateScrapApprovalReference(
        [
          { approvalReference: 'WMR-2026-014' },
          { approvalReference: 'WMR-2026-002' },
          { approvalReference: 'WMR-2026-009' },
        ],
        at,
      ),
    ).toBe('WMR-2026-015');
  });

  it('ignores other years and unrelated references', () => {
    expect(
      generateScrapApprovalReference(
        [
          { approvalReference: 'WMR-2025-099' },
          { approvalReference: 'IIRUP-2026-050' },
          { approvalReference: null },
          {},
        ],
        at,
      ),
    ).toBe('WMR-2026-001');
  });

  it('matches case-insensitively and pads to three digits', () => {
    expect(generateScrapApprovalReference([{ approvalReference: 'wmr-2026-7' }], at)).toBe(
      'WMR-2026-008',
    );
  });
});
