import type { LedgerSheet } from './ledgerSheets';

/** Download a ledger sheet as CSV (UTF-8 BOM so Excel keeps the ₱ glyphs). */
export function exportLedgerCsv(sheet: LedgerSheet, rows: any[], yearLabel: string): void {
  const exportCols = sheet.columns.filter((c) => c.key !== 'view');
  const headers = exportCols.map((c) => String(c.header));
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(
      exportCols
        .map((c) => {
          const raw = c.value ? c.value(row) : '';
          const s = String(raw ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    );
  }

  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SORT_Ledger_${yearLabel}_${sheet.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
