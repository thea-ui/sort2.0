import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, Lock, Printer } from 'lucide-react';
import { useMockData } from '../../hooks/useMockData';
import { useTheme } from '../../hooks/useTheme';
import { useSchoolYear } from '../../hooks/useSchoolYear';
import { useSystemPresets } from '../../hooks/useSystemPresets';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/api';
import { LoadingState } from '../../components/common/LoadingState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatLongDate, formatTime } from '../../utils/dateFormat';
import { parsePrintParams } from '../admin/components/reports-hub/printUrl';
import { type ReportHubFilters } from '../admin/components/reports-hub/reportHubTypes';
import { useHubReports } from '../admin/components/reports-hub/useHubReports';
import { useSalesLedger } from '../admin/components/reports-hub/useSalesLedger';
import { useWalkInLedger } from '../admin/components/reports-hub/useWalkInLedger';
import { ReportsHubFilterBar } from '../admin/components/reports-hub/ReportsHubFilterBar';
import {
  assetFooter,
  buildReportRows,
  collectGradeLevels,
  filterLedgerRows,
  filterReportRows,
  filterWalkInRows,
  ledgerFooter,
  narrowLedgerRows,
  narrowReportRows,
  walkinFooter,
  wasteFooter,
} from '../admin/components/reports-hub/reportHubRows';
import {
  assetPrintColumns,
  ledgerPrintColumns,
  walkinPrintColumns,
  wastePrintColumns,
} from './printColumns';
import { buildPrintJob } from './printModel';
import { ReportPrintTable } from './ReportPrintTable';
import { exportPrintCsv } from './printCsv';

const normalizeKey = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const ReportPrintPage: React.FC = () => {
  const { isAuthenticated } = useMockData();
  const toast = useToast();
  const { schoolName, schoolAcronym, logoUrl } = useTheme();
  const { allSchoolYears } = useSchoolYear();
  const { categories, presetGroups } = useSystemPresets();
  const { target, filters: urlFilters } = useMemo(() => parsePrintParams(window.location.search), []);
  const generatedAt = useMemo(() => new Date(), []);

  // Interactive filters on this page; seeded from the link that opened it.
  const [pageFilters, setPageFilters] = useState<ReportHubFilters>(urlFilters);
  const [location, setLocation] = useState('');
  const [exporting, setExporting] = useState(false);
  const [pdfOffer, setPdfOffer] = useState<{ url: string; fileName: string } | null>(null);

  const isWalkIn = target.section === 'walkin';
  const isLedger = target.section === 'ledger-market' || target.section === 'ledger-scrap';
  const { reports, loading: reportsLoading } = useHubReports(pageFilters.yearId);
  const { rows: ledgerSource, loading: ledgerLoading } = useSalesLedger(pageFilters.yearId);
  const { rows: walkInSource, loading: walkInLoading } = useWalkInLedger(pageFilters.yearId);

  const taxonomy = useMemo(() => ({ categories, groups: presetGroups }), [categories, presetGroups]);
  const allRows = useMemo(() => buildReportRows(reports, taxonomy), [reports, taxonomy]);
  const filteredReports = useMemo(() => filterReportRows(allRows, pageFilters), [allRows, pageFilters]);
  const filteredLedger = useMemo(() => filterLedgerRows(ledgerSource, pageFilters), [ledgerSource, pageFilters]);
  const filteredWalkIns = useMemo(() => filterWalkInRows(walkInSource, pageFilters), [walkInSource, pageFilters]);

  // Rows for this leaf, before the location refinement.
  const baseRows = useMemo(() => {
    if (isWalkIn) return filteredWalkIns;
    if (isLedger) return narrowLedgerRows(filteredLedger, target);
    return narrowReportRows(filteredReports, target);
  }, [isWalkIn, isLedger, filteredWalkIns, filteredLedger, filteredReports, target]);

  // Location options come from the un-refined set so switching stays possible.
  const locations = useMemo(
    () =>
      isWalkIn || isLedger
        ? []
        : [...new Set((baseRows as ReturnType<typeof narrowReportRows>).map((row) => row.locationName))]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)),
    [baseRows, isWalkIn, isLedger],
  );

  const rows = useMemo(
    () => (location ? baseRows.filter((row) => ('locationName' in row ? row.locationName === location : true)) : baseRows),
    [baseRows, location],
  );

  const assetCategoryName = useMemo(() => {
    if (target.section !== 'asset') return '';
    return (
      categories.find((category) => normalizeKey(category.code) === normalizeKey(target.categoryCode ?? ''))?.name ??
      target.categoryCode ??
      'Other'
    );
  }, [categories, target]);

  const yearLabel = useMemo(
    () => allSchoolYears.find((year) => year.id === pageFilters.yearId)?.label ?? 'All school years',
    [allSchoolYears, pageFilters.yearId],
  );

  const gradeOptions = useMemo(
    () =>
      isWalkIn || isLedger
        ? []
        : collectGradeLevels(filterReportRows(allRows, { ...pageFilters, gradeLevels: [] })),
    [isWalkIn, isLedger, allRows, pageFilters],
  );

  const job = useMemo(() => {
    const shared = {
      target,
      filters: pageFilters,
      yearLabel,
      location: location || undefined,
      generatedAt,
    };
    if (isWalkIn) {
      return buildPrintJob({
        ...shared,
        columns: walkinPrintColumns(),
        rows: rows as ReturnType<typeof filterWalkInRows>,
        footer: walkinFooter(rows as ReturnType<typeof filterWalkInRows>),
      });
    }
    if (isLedger) {
      const ledgerRows = rows as ReturnType<typeof filterLedgerRows>;
      return buildPrintJob({ ...shared, columns: ledgerPrintColumns(), rows: ledgerRows, footer: ledgerFooter(ledgerRows) });
    }
    if (target.section === 'asset') {
      const reportRows = rows as ReturnType<typeof narrowReportRows>;
      return buildPrintJob({
        ...shared,
        assetCategoryName,
        columns: assetPrintColumns(),
        rows: reportRows,
        footer: assetFooter(reportRows),
      });
    }
    const wasteRows = rows as ReturnType<typeof narrowReportRows>;
    return buildPrintJob({ ...shared, columns: wastePrintColumns(), rows: wasteRows, footer: wasteFooter(wasteRows) });
  }, [isWalkIn, isLedger, target, pageFilters, yearLabel, location, generatedAt, rows, assetCategoryName]);

  useEffect(() => {
    // The theme provider rewrites the browser title when branding refreshes;
    // pin it back so "Save as PDF" names the file after this report.
    const applyTitle = () => {
      if (document.title !== job.title) document.title = job.title;
    };
    applyTitle();
    const observer = new MutationObserver(applyTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [job.title]);

  const loading = isWalkIn ? walkInLoading : isLedger ? ledgerLoading : reportsLoading;

  const handleCsv = () => {
    const csvName = job.fileName.replace(/\.pdf$/, '.csv');
    if (isWalkIn) exportPrintCsv(csvName, walkinPrintColumns(), rows as ReturnType<typeof filterWalkInRows>);
    else if (isLedger) exportPrintCsv(csvName, ledgerPrintColumns(), rows as ReturnType<typeof filterLedgerRows>);
    else if (target.section === 'asset')
      exportPrintCsv(csvName, assetPrintColumns(), rows as ReturnType<typeof narrowReportRows>);
    else exportPrintCsv(csvName, wastePrintColumns(), rows as ReturnType<typeof narrowReportRows>);
  };

  const dismissPdfOffer = () => {
    // The offered URL stays valid for a while so "Open PDF" keeps working.
    if (pdfOffer) setTimeout(() => URL.revokeObjectURL(pdfOffer.url), 60000);
    setPdfOffer(null);
  };

  const handleDownloadPdf = async () => {
    setExporting(true);
    try {
      const blob = await apiService.exportReportPdfBlob(job.payload);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = job.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setPdfOffer({ url, fileName: job.fileName });
    } catch (error: any) {
      toast.error(error?.message || 'PDF export failed. Use Print to save the page as PDF instead.');
    } finally {
      setExporting(false);
    }
  };

  const table = isWalkIn ? (
    <ReportPrintTable
      columns={walkinPrintColumns()}
      rows={rows as ReturnType<typeof filterWalkInRows>}
      footer={walkinFooter(rows as ReturnType<typeof filterWalkInRows>)}
      emptyLabel="No walk-in turnovers match this report."
    />
  ) : isLedger ? (
    <ReportPrintTable
      columns={ledgerPrintColumns()}
      rows={rows as ReturnType<typeof filterLedgerRows>}
      footer={ledgerFooter(rows as ReturnType<typeof filterLedgerRows>)}
      emptyLabel="No sales match this report."
    />
  ) : target.section === 'asset' ? (
    <ReportPrintTable
      columns={assetPrintColumns()}
      rows={rows as ReturnType<typeof narrowReportRows>}
      footer={assetFooter(rows as ReturnType<typeof narrowReportRows>)}
      emptyLabel="No reports match this report."
    />
  ) : (
    <ReportPrintTable
      columns={wastePrintColumns()}
      rows={rows as ReturnType<typeof narrowReportRows>}
      footer={wasteFooter(rows as ReturnType<typeof narrowReportRows>)}
      emptyLabel="No reports match this report."
    />
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center space-y-3 max-w-sm">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-[var(--primary)]/5 text-[var(--text-strong)]/40 flex items-center justify-center">
            <Lock size={22} />
          </div>
          <p className="text-sm font-bold text-[#111827]">Report session not found</p>
          <p className="text-xs text-[#6B7280]">
            Printed reports open from the Admin console. Sign in, then open Reports and select the deepest folder again.
          </p>
          <a
            href="/admin"
            className="inline-flex px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold"
          >
            Go to Admin sign-in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="print-hide sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#E5E7EB]">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[var(--text-strong)]/60">{job.title}</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold shadow-sm hover:opacity-90 transition cursor-pointer disabled:opacity-60"
            >
              <FileDown size={14} /> {exporting ? 'Preparing…' : 'Download PDF'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--primary)]/15 text-xs font-bold text-[var(--text-strong)] hover:bg-[var(--primary)]/5 transition cursor-pointer"
            >
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              onClick={handleCsv}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--primary)]/15 text-xs font-bold text-[var(--text-strong)] hover:bg-[var(--primary)]/5 transition cursor-pointer"
            >
              Download CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-5">
        <div className="print-hide">
          <ReportsHubFilterBar
            filters={pageFilters}
            onChange={setPageFilters}
            years={allSchoolYears.map((year) => ({
              id: year.id,
              label: year.label,
              isActive: year.id === (allSchoolYears.find((entry) => entry.isActive)?.id ?? ''),
              startDate: year.startDate,
              endDate: year.endDate,
            }))}
            resultCount={rows.length}
            locations={locations}
            location={location}
            onLocationChange={setLocation}
            hideStatuses={isWalkIn}
            gradeOptions={gradeOptions}
            defaultYearId={allSchoolYears.find((year) => year.isActive)?.id}
            resultLabel="records in this report"
          />
          {pageFilters.yearId !== urlFilters.yearId && (
            <p className="text-[11px] text-[var(--text-strong)]/45 pt-2">
              School year changed on this page — folder counts on the hub keep the year you opened it with.
            </p>
          )}
        </div>

        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-[var(--primary)]/15 pb-5">
          <div className="flex items-center gap-4">
            {logoUrl && <img src={logoUrl} alt="" className="h-14 w-14 object-contain" />}
            <div>
              <p className="text-lg font-bold text-[#111827]">
                {schoolName || 'S.O.R.T. — Smart Operational Recovery & Tracking'}
              </p>
              {schoolAcronym && <p className="text-[11px] text-[#6B7280]">{schoolAcronym}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#6B7280]">Generated</p>
            <p className="text-xs font-semibold text-[#111827]">
              {formatLongDate(generatedAt)} · {formatTime(generatedAt)}
            </p>
          </div>
        </header>

        <div>
          <h1 className="text-xl font-bold text-[#111827]">{job.title}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-[#6B7280] pt-2">
            {job.metaLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
            <span>
              <b>Records:</b> {job.recordCount}
            </span>
          </div>
        </div>

        {loading ? <LoadingState label="Preparing report..." /> : table}

        <p className="text-[10px] text-[#9CA3AF]">
          Generated by S.O.R.T. · Filters carried from the Reports hub · All amounts in Philippine Peso (₱).
        </p>
      </div>

      <ConfirmDialog
        open={pdfOffer !== null}
        onOpenChange={(open) => {
          if (!open) dismissPdfOffer();
        }}
        title="PDF downloaded"
        description={`"${job.fileName}" was saved to your downloads. Open the PDF in this tab, or stay on this page?`}
        confirmLabel="Open PDF"
        cancelLabel="Stay here"
        onConfirm={() => {
          if (pdfOffer) {
            // Same tab: the browser's PDF viewer replaces this page (Back returns here).
            setPdfOffer(null);
            window.location.assign(pdfOffer.url);
          }
        }}
      />
    </div>
  );
};
