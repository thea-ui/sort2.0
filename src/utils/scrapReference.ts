export interface ScrapReferenceSource {
  approvalReference?: string | null;
}

/**
 * Builds the next Disposal Committee approval reference in the
 * `WMR-<year>-<seq>` series, continuing past the highest sequence already
 * recorded on scrap stocks or scrap sale transactions for the same year.
 */
export function generateScrapApprovalReference(
  sources: ScrapReferenceSource[],
  date: Date = new Date(),
): string {
  const year = date.getFullYear();
  const pattern = new RegExp(`^WMR-${year}-(\\d+)$`);
  let max = 0;
  for (const source of sources) {
    const match = pattern.exec((source.approvalReference || '').trim().toUpperCase());
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `WMR-${year}-${String(max + 1).padStart(3, '0')}`;
}
