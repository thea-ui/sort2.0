import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getPublicBranding, type PublicBranding } from './branding.service.js';

/**
 * Data-report PDF generator (Reports hub → "Download"/view). The client posts
 * the exact filtered table it shows on screen (headers, rows, totals), so the
 * PDF is always WYSIWYG with the hub and its HTML print view.
 *
 * Payloads are untrusted: every string is length-capped and the row/column
 * counts are bounded before rendering.
 */

export interface ReportPdfColumn {
  header: string;
  /** Relative width weight; normalised to the printable width. */
  width: number;
  align?: 'left' | 'center' | 'right';
  /** Renders in a smaller font (e.g. report UUIDs). */
  small?: boolean;
}

export interface ReportPdfPayload {
  title: string;
  metaLines: string[];
  recordCount: number;
  generatedLabel: string;
  columns: ReportPdfColumn[];
  rows: string[][];
  totals?: string[];
}

// Hard cap on exported rows: keeps the PDFKit page buffers + table layout
// bounded. Callers are told to narrow their filters instead.
export const MAX_REPORT_PDF_ROWS = 1500;
const MAX_ROWS = MAX_REPORT_PDF_ROWS;
const MAX_COLUMNS = 14;
const MAX_CELL_CHARS = 400;
const MAX_META_LINES = 8;

export class ReportPdfError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function capText(value: unknown, max: number): string {
  if (value === null || value === undefined) return '';
  return String(value).slice(0, max);
}

/** Validate + normalise an untrusted payload before rendering. */
export function normalizeReportPdfPayload(raw: unknown): ReportPdfPayload {
  if (!raw || typeof raw !== 'object') {
    throw new ReportPdfError('A report payload is required.');
  }
  const body = raw as Record<string, unknown>;

  const rawColumns = Array.isArray(body.columns) ? body.columns : [];
  if (rawColumns.length === 0 || rawColumns.length > MAX_COLUMNS) {
    throw new ReportPdfError(`columns must contain 1-${MAX_COLUMNS} entries.`);
  }

  const columns: ReportPdfColumn[] = rawColumns.map((entry) => {
    const column = (entry ?? {}) as Record<string, unknown>;
    const weight = Number(column.width);
    return {
      header: capText(column.header, 60) || '—',
      width: Number.isFinite(weight) && weight > 0 ? Math.min(weight, 100) : 10,
      align: column.align === 'right' || column.align === 'center' ? column.align : 'left',
      small: column.small === true,
    };
  });

  const rawRows = Array.isArray(body.rows) ? body.rows : [];
  if (rawRows.length > MAX_ROWS) {
    throw new ReportPdfError(
      `This report has ${rawRows.length} rows; the PDF export supports up to ${MAX_ROWS}. Narrow the filters first.`,
      413,
    );
  }
  const rows = rawRows.map((entry) => {
    const cells = Array.isArray(entry) ? entry : [];
    return columns.map((_, index) => capText(cells[index], MAX_CELL_CHARS));
  });

  const rawTotals = Array.isArray(body.totals) ? body.totals : null;
  const totals = rawTotals ? columns.map((_, index) => capText(rawTotals[index], MAX_CELL_CHARS)) : undefined;

  const rawMeta = Array.isArray(body.metaLines) ? body.metaLines : [];
  const metaLines = rawMeta.slice(0, MAX_META_LINES).map((line) => capText(line, 160)).filter(Boolean);

  const recordCount = Number(body.recordCount);

  return {
    title: capText(body.title, 160) || 'Report',
    metaLines,
    recordCount: Number.isFinite(recordCount) && recordCount >= 0 ? recordCount : rows.length,
    generatedLabel: capText(body.generatedLabel, 80),
    columns,
    rows,
    totals,
  };
}

export function reportPdfFileName(title: string): string {
  const slug = title
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80);
  return `${slug || 'report'}.pdf`;
}

// ── Colour helpers ─────────────────────────────────────────────────────

const HEX = /^#([0-9a-fA-F]{6})$/;

/** Blend a hex colour toward white (amount 0 = original, 1 = white). */
function tintHex(hex: string, amount: number): string {
  const match = HEX.exec(hex.trim());
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  const ratio = Math.min(1, Math.max(0, amount));
  const channel = (offset: number) => {
    const original = (value >> offset) & 0xff;
    return Math.round(original + (255 - original) * ratio);
  };
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
}

const INK = '#111827';
const INK_SOFT = '#4B5563';
const RULE = '#D1D5DB';
const ZEBRA = '#F8F7F5';

export function createReportPdfTempPath(): string {
  return path.join(os.tmpdir(), `sort-report-${randomUUID()}.pdf`);
}

type PdfDocument = InstanceType<typeof PDFDocument>;

const DOC_OPTIONS = {
  size: 'A4' as const,
  layout: 'landscape' as const,
  margins: { top: 0, bottom: 0, left: 0, right: 0 },
  bufferPages: true,
};

/** Render to an in-memory buffer (unit tests / small callers). */
export async function generateReportPdf(
  payload: ReportPdfPayload,
  brandingOverride?: PublicBranding,
): Promise<Buffer> {
  const branding = brandingOverride ?? (await getPublicBranding());

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(DOC_OPTIONS);

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    renderReportPdfDocument(doc, payload, branding);
  });
}

/**
 * Stream the PDF straight to a temp file. The HTTP route uses this so the
 * server never holds the document chunks + a concatenated buffer + the
 * response copy at the same time.
 */
export async function generateReportPdfToFile(
  payload: ReportPdfPayload,
  targetPath: string,
  brandingOverride?: PublicBranding,
): Promise<void> {
  const branding = brandingOverride ?? (await getPublicBranding());

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument(DOC_OPTIONS);
    const output = fs.createWriteStream(targetPath);
    output.on('finish', () => resolve());
    output.on('error', reject);
    doc.on('error', reject);
    doc.pipe(output);
    renderReportPdfDocument(doc, payload, branding);
  });
}

function renderReportPdfDocument(
  doc: PdfDocument,
  payload: ReportPdfPayload,
  branding: PublicBranding,
): void {
  const accent = branding.accentColor || '#00A77C';
  const primary = branding.primaryColor || '#00271D';
  const gold = branding.goldColor || '#C69B26';
  const schoolName = branding.schoolName?.trim() || 'S.O.R.T. — Smart Operational Recovery & Tracking';

  const width = doc.page.width;
  const height = doc.page.height;
  const marginX = 30;
  const usableWidth = width - marginX * 2;
  const bottomLimit = height - 44;

    const totalWeight = payload.columns.reduce((sum, column) => sum + column.width, 0);
    const columnWidths = payload.columns.map((column) => (column.width / totalWeight) * usableWidth);

    const drawLetterhead = (compact: boolean) => {
      let y = compact ? 16 : 24;

      if (!compact) {
        doc.font('Helvetica').fontSize(7).fillColor(INK_SOFT);
        doc.text(
          ['REPUBLIC OF THE PHILIPPINES', 'DEPARTMENT OF EDUCATION', branding.region?.trim().toUpperCase()]
            .filter(Boolean)
            .join('   \u2022   '),
          marginX,
          y,
          { width: usableWidth, align: 'center', characterSpacing: 1.1 },
        );
        y += 12;

        doc.font('Helvetica-Bold').fontSize(14).fillColor(INK);
        doc.text(schoolName.toUpperCase(), marginX, y, { width: usableWidth, align: 'center', characterSpacing: 1.4 });
        y += 19;

        doc.font('Helvetica-Bold').fontSize(7).fillColor(accent);
        doc.text('CAMPUS MATERIAL RECOVERY FACILITY   \u2022   ECOLOGICAL RECOVERY PROGRAM', marginX, y, {
          width: usableWidth,
          align: 'center',
          characterSpacing: 1.2,
        });
        y += 12;

        doc.moveTo(marginX, y).lineTo(width - marginX, y).lineWidth(1.1).stroke(gold);
        doc.moveTo(marginX, y + 2).lineTo(width - marginX, y + 2).lineWidth(0.4).stroke(tintHex(gold, 0.45));
        y += 12;
      } else {
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(INK_SOFT);
        doc.text(`${schoolName.toUpperCase()} — ${payload.title} (continued)`, marginX, y, {
          width: usableWidth,
          align: 'left',
        });
        y += 13;
        doc.moveTo(marginX, y).lineTo(width - marginX, y).lineWidth(0.5).stroke(RULE);
        y += 7;
      }

      return y;
    };

    const drawTitleBlock = (y: number): number => {
      doc.font('Helvetica-Bold').fontSize(11.5).fillColor(INK);
      doc.text(payload.title, marginX, y, { width: usableWidth - 200, align: 'left' });

      doc.font('Helvetica').fontSize(7.5).fillColor(INK_SOFT);
      doc.text(`Generated: ${payload.generatedLabel}`, marginX, y + 1, { width: usableWidth, align: 'right' });

      let metaY = y + 17;
      doc.font('Helvetica').fontSize(7.5).fillColor(INK_SOFT);
      doc.text([...payload.metaLines, `Records: ${payload.recordCount}`].join('     \u2022     '), marginX, metaY, {
        width: usableWidth,
        align: 'left',
      });
      metaY += 14;
      return metaY;
    };

    const drawTableHeader = (y: number): number => {
      // Header band
      doc.rect(marginX, y, usableWidth, 16).fill(tintHex(primary, 0.92));
      doc.moveTo(marginX, y + 16).lineTo(width - marginX, y + 16).lineWidth(0.8).stroke(tintHex(primary, 0.55));

      let x = marginX;
      payload.columns.forEach((column, index) => {
        doc.font('Helvetica-Bold').fontSize(6.8).fillColor(tintHex(primary, 0.25));
        doc.text(column.header.toUpperCase(), x + 4, y + 5, {
          width: columnWidths[index] - 8,
          align: column.align ?? 'left',
          lineBreak: false,
          ellipsis: true,
        });
        x += columnWidths[index];
      });
      return y + 16;
    };

    const measureRow = (cells: string[]): number => {
      let rowHeight = 14;
      cells.forEach((text, index) => {
        doc.font(payload.columns[index].small ? 'Courier' : 'Helvetica').fontSize(payload.columns[index].small ? 6.4 : 7.6);
        const textHeight = doc.heightOfString(text, { width: columnWidths[index] - 8, lineGap: 0.6 });
        rowHeight = Math.max(rowHeight, textHeight + 6);
      });
      return rowHeight;
    };

    const drawRow = (cells: string[], y: number, rowHeight: number, options: { zebra?: boolean; bold?: boolean; topRule?: boolean } = {}) => {
      if (options.zebra) {
        doc.rect(marginX, y, usableWidth, rowHeight).fill(ZEBRA);
      }
      if (options.topRule) {
        doc.moveTo(marginX, y).lineTo(width - marginX, y).lineWidth(0.8).stroke(tintHex(primary, 0.55));
      }

      let x = marginX;
      cells.forEach((text, index) => {
        const column = payload.columns[index];
        doc
          .font(options.bold ? 'Helvetica-Bold' : column.small ? 'Courier' : 'Helvetica')
          .fontSize(column.small && !options.bold ? 6.4 : 7.6)
          .fillColor(INK);
        doc.text(text, x + 4, y + 3, {
          width: columnWidths[index] - 8,
          align: column.align ?? 'left',
          lineGap: 0.6,
        });
        x += columnWidths[index];
      });

      doc.moveTo(marginX, y + rowHeight).lineTo(width - marginX, y + rowHeight).lineWidth(0.35).stroke(RULE);
    };

    // ── Render ────────────────────────────────────────────────────────
    let y = drawLetterhead(false);
    y = drawTitleBlock(y);
    y = drawTableHeader(y);

    payload.rows.forEach((cells, index) => {
      const rowHeight = measureRow(cells);
      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = drawLetterhead(true);
        y = drawTableHeader(y);
      }
      drawRow(cells, y, rowHeight, { zebra: index % 2 === 1 });
      y += rowHeight;
    });

    if (payload.rows.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor(INK_SOFT);
      doc.text('No records match this report.', marginX, y + 14, { width: usableWidth, align: 'center' });
      y += 34;
    }

    if (payload.totals && payload.totals.some(Boolean)) {
      const totalsHeight = measureRow(payload.totals) + 2;
      if (y + totalsHeight > bottomLimit) {
        doc.addPage();
        y = drawLetterhead(true);
        y = drawTableHeader(y);
      }
      drawRow(payload.totals, y, totalsHeight, { bold: true, topRule: true });
      y += totalsHeight;
    }

    // ── Footers (every page) ──────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      const footY = height - 32;
      doc.font('Helvetica').fontSize(6.5).fillColor(INK_SOFT);
      doc.text(
        'S.O.R.T. — Smart Operational Recovery and Tracking System for School-Based Material Recovery Facility',
        marginX,
        footY,
        { width: usableWidth - 120, align: 'left', lineBreak: false },
      );
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(accent);
      doc.text(`Page ${pageIndex + 1} of ${range.count}`, marginX, footY, {
        width: usableWidth,
        align: 'right',
        lineBreak: false,
      });
    }

  doc.end();
}
