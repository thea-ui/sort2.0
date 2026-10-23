import React from 'react';

export type PrintAlign = 'left' | 'center' | 'right';

export interface PrintColumn<T> {
  header: string;
  align?: PrintAlign;
  cell: (row: T) => React.ReactNode;
  csv: (row: T) => string | number;
  /** Shared class for every cell in this column. */
  className?: string;
  /**
   * PDF cell text when it should differ from the CSV value (e.g. an em-dash
   * instead of 0 for "no data"); falls back to `csv` when omitted.
   */
  pdfValue?: (row: T) => string;
  /** Layout hints for the server-rendered PDF (relative width, small font). */
  pdf?: { width: number; small?: boolean };
}

interface ReportPrintTableProps<T> {
  columns: PrintColumn<T>[];
  rows: T[];
  footer?: React.ReactNode[];
  emptyLabel?: string;
}

const cellClass = 'px-2.5 py-2 align-top text-[11px] leading-snug';

const ALIGN_CLASS: Record<PrintAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function ReportPrintTable<T>({
  columns,
  rows,
  footer,
  emptyLabel = 'No records match this report.',
}: ReportPrintTableProps<T>) {
  if (rows.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-[var(--text-strong)]/50">{emptyLabel}</p>
    );
  }

  return (
    <table className="w-full border-collapse" aria-label="Detailed report table">
      <thead>
        <tr className="bg-[color-mix(in_srgb,var(--primary)_6%,white)]">
          {columns.map((column) => (
            <th
              key={column.header}
              scope="col"
              className={`${cellClass} border border-[#E5E7EB] font-bold text-[10px] uppercase tracking-wide text-[var(--text-strong)]/70 ${
                ALIGN_CLASS[column.align ?? 'left']
              }`}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="odd:bg-white even:bg-[#FAFAFA]">
            {columns.map((column) => (
              <td
                key={column.header}
                className={`${cellClass} border border-[#E5E7EB] text-[var(--text-strong)] ${
                  ALIGN_CLASS[column.align ?? 'left']
                } ${column.align === 'right' ? 'whitespace-nowrap' : ''} ${column.className ?? ''}`}
              >
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {footer && (
        <tfoot>
          <tr className="bg-[color-mix(in_srgb,var(--primary)_6%,white)] font-bold">
            {footer.map((value, index) => (
              <td
                key={index}
                className={`${cellClass} border border-[#E5E7EB] text-[11px] text-[var(--text-strong)] ${
                  index === 0 ? 'text-left' : 'text-right whitespace-nowrap'
                }`}
              >
                {value}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
}
