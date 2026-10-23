import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, FolderOpen, FolderTree } from 'lucide-react';
import { EmptyState } from '../../../../components/common/EmptyState';
import { LoadingState } from '../../../../components/common/LoadingState';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { DataTable } from '../../../../components/data-table';
import { useToast } from '../../../../hooks/useToast';
import { useSchoolYear } from '../../../../hooks/useSchoolYear';
import { useSystemPresets } from '../../../../hooks/useSystemPresets';
import { apiService } from '../../../../services/api';
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
} from './reportHubRows';
import { buildAssetFolder, buildLedgerFolder, buildRecordsFolder, buildWasteFolder } from './reportHubFolders';
import {
  filterLeaderboardRecords,
  filterPointRecords,
  filterStockRecords,
  leaderboardFooter,
  pointsFooter,
  stockFooter,
} from './recordRows';
import { DEFAULT_HUB_FILTERS } from './reportHubTypes';
import type { HubFolderNode, HubRootFolder, ReportHubFilters } from './reportHubTypes';
import { ReportFolderRow, ReportFolderTile } from './ReportFolderCard';
import type { FolderNoun } from './ReportFolderCard';
import { ReportsBreadcrumbs } from './ReportsBreadcrumbs';
import { ReportsHubFilterBar } from './ReportsHubFilterBar';
import { useHubReports } from './useHubReports';
import { useSalesLedger } from './useSalesLedger';
import { useWalkInLedger } from './useWalkInLedger';
import { useYearRecords } from './useYearRecords';
import {
  assetTableColumns,
  leaderboardTableColumns,
  ledgerTableColumns,
  pointLedgerTableColumns,
  stockTableColumns,
  walkinTableColumns,
  wasteTableColumns,
} from './hubTableColumns';
import {
  assetRowDetail,
  leaderboardRecordDetail,
  ledgerRowDetail,
  pointRecordDetail,
  stockRecordDetail,
  walkinRowDetail,
  wasteRowDetail,
} from './hubRowDetails';
import type { HubRowDetail } from './hubRowDetails';
import { HubRowDetailModal } from './HubRowDetailModal';
import {
  assetPrintColumns,
  leaderboardPrintColumns,
  ledgerPrintColumns,
  pointLedgerPrintColumns,
  stockPrintColumns,
  walkinPrintColumns,
  wastePrintColumns,
} from '../../../report-print/printColumns';
import { buildPrintJob, buildPrintTitle } from '../../../report-print/printModel';

function resolveTrail(roots: HubRootFolder[], ids: string[]): HubFolderNode[] {
  const nodes: HubFolderNode[] = [];
  let list: HubFolderNode[] = roots;
  for (const id of ids) {
    const node = list.find((folder) => folder.id === id);
    if (!node) break;
    nodes.push(node);
    list = node.children ?? [];
  }
  return nodes;
}

export const ReportsHubTab: React.FC = () => {
  const toast = useToast();
  const { categories, presetGroups } = useSystemPresets();
  const { allSchoolYears, activeSchoolYear } = useSchoolYear();
  const [filters, setFilters] = useState<ReportHubFilters>(DEFAULT_HUB_FILTERS);
  const [trailIds, setTrailIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [pdfOffer, setPdfOffer] = useState<{ url: string; fileName: string } | null>(null);
  const [detail, setDetail] = useState<HubRowDetail | null>(null);

  const { reports, loading: reportsLoading, degraded } = useHubReports(filters.yearId);
  const { rows: ledgerSource, loading: ledgerLoading } = useSalesLedger(filters.yearId);
  const { rows: walkInSource, loading: walkInLoading } = useWalkInLedger(filters.yearId);
  const {
    points: pointSource,
    leaderboard: leaderboardSource,
    stock: stockSource,
    loading: recordsLoading,
    degraded: recordsDegraded,
  } = useYearRecords(filters.yearId);

  // The filter rests on the current (active) school year until the admin
  // changes it — the initial render may precede the school-year fetch.
  const yearDefaultApplied = useRef(false);
  useEffect(() => {
    if (yearDefaultApplied.current || !activeSchoolYear?.id) return;
    yearDefaultApplied.current = true;
    setFilters((prev) => (prev.yearId === 'ALL' ? { ...prev, yearId: activeSchoolYear.id } : prev));
  }, [activeSchoolYear?.id]);

  const taxonomy = useMemo(
    () => ({ categories, groups: presetGroups }),
    [categories, presetGroups],
  );

  const allRows = useMemo(() => buildReportRows(reports, taxonomy), [reports, taxonomy]);
  const filteredRows = useMemo(() => filterReportRows(allRows, filters), [allRows, filters]);
  const filteredLedger = useMemo(() => filterLedgerRows(ledgerSource, filters), [ledgerSource, filters]);
  const filteredWalkIns = useMemo(() => filterWalkInRows(walkInSource, filters), [walkInSource, filters]);
  const filteredPoints = useMemo(() => filterPointRecords(pointSource, filters), [pointSource, filters]);
  const filteredLeaderboard = useMemo(
    () => filterLeaderboardRecords(leaderboardSource, filters),
    [leaderboardSource, filters],
  );
  const filteredStock = useMemo(() => filterStockRecords(stockSource, filters), [stockSource, filters]);

  // Grade options stay visible even while a grade is selected.
  const gradeOptions = useMemo(
    () => collectGradeLevels(filterReportRows(allRows, { ...filters, gradeLevels: [] })),
    [allRows, filters],
  );

  const roots = useMemo<HubRootFolder[]>(
    () => [
      buildWasteFolder(filteredRows.filter((row) => row.kind === 'WASTE')),
      buildAssetFolder(filteredRows.filter((row) => row.kind === 'ASSET'), taxonomy),
      buildLedgerFolder(filteredLedger, filteredWalkIns),
      buildRecordsFolder(filteredPoints, filteredLeaderboard, filteredStock),
    ],
    [filteredRows, filteredLedger, filteredWalkIns, filteredPoints, filteredLeaderboard, filteredStock, taxonomy],
  );

  const trail = useMemo(() => resolveTrail(roots, trailIds), [roots, trailIds]);

  useEffect(() => {
    if (trail.length !== trailIds.length) {
      setTrailIds((ids) => ids.slice(0, trail.length));
    }
  }, [trail, trailIds]);

  const currentFolder = trail[trail.length - 1] ?? null;
  const isLeafView = Boolean(currentFolder?.print) && !(currentFolder?.children && currentFolder.children.length > 0);

  /** Standard admin table + full-report PDF builder for the open leaf folder. */
  const leafView = (() => {
    const target = currentFolder?.print;
    if (!target || !isLeafView) return null;
    const yearLabel = allSchoolYears.find((year) => year.id === filters.yearId)?.label ?? 'All school years';
    const showYear = filters.yearId === 'ALL';
    const base = { target, filters, yearLabel };
    const tableProps = {
      rowKey: (row: { id: string }) => row.id,
      emptyTitle: 'No records match the current filters.',
      emptyHint: 'Try adjusting the filters above.',
    } as const;

    if (target.section === 'walkin') {
      const all = filteredWalkIns;
      return {
        title: buildPrintTitle(target, ''),
        total: all.length,
        makeJob: () => buildPrintJob({ ...base, columns: walkinPrintColumns(), rows: all, footer: walkinFooter(all) }),
        node: (
          <DataTable
            {...tableProps}
            columns={walkinTableColumns((row) => setDetail(walkinRowDetail(row)))}
            rows={all}
            minWidth="1050px"
          />
        ),
      };
    }

    if (target.section === 'ledger-market' || target.section === 'ledger-scrap') {
      const all = narrowLedgerRows(filteredLedger, target);
      return {
        title: buildPrintTitle(target, ''),
        total: all.length,
        makeJob: () => buildPrintJob({ ...base, columns: ledgerPrintColumns(), rows: all, footer: ledgerFooter(all) }),
        node: (
          <DataTable
            {...tableProps}
            columns={ledgerTableColumns((row) => setDetail(ledgerRowDetail(row)))}
            rows={all}
            minWidth="900px"
          />
        ),
      };
    }

    if (target.section === 'points') {
      const all = filteredPoints;
      return {
        title: buildPrintTitle(target, ''),
        total: all.length,
        makeJob: () =>
          buildPrintJob({
            ...base,
            columns: pointLedgerPrintColumns(showYear),
            rows: all,
            footer: pointsFooter(all, showYear),
          }),
        node: (
          <DataTable
            {...tableProps}
            columns={pointLedgerTableColumns((row) => setDetail(pointRecordDetail(row)), showYear)}
            rows={all}
            minWidth="950px"
          />
        ),
      };
    }

    if (target.section === 'leaderboard') {
      const all = filteredLeaderboard;
      return {
        title: buildPrintTitle(target, ''),
        total: all.length,
        makeJob: () =>
          buildPrintJob({
            ...base,
            columns: leaderboardPrintColumns(showYear),
            rows: all,
            footer: leaderboardFooter(all, showYear),
          }),
        node: (
          <DataTable
            {...tableProps}
            columns={leaderboardTableColumns((row) => setDetail(leaderboardRecordDetail(row)), showYear)}
            rows={all}
            minWidth="850px"
          />
        ),
      };
    }

    if (target.section === 'stock') {
      const all = filteredStock;
      return {
        title: buildPrintTitle(target, ''),
        total: all.length,
        makeJob: () =>
          buildPrintJob({
            ...base,
            columns: stockPrintColumns(showYear),
            rows: all,
            footer: stockFooter(all, showYear),
          }),
        node: (
          <DataTable
            {...tableProps}
            columns={stockTableColumns((row) => setDetail(stockRecordDetail(row)), showYear)}
            rows={all}
            minWidth="800px"
          />
        ),
      };
    }

    const all = narrowReportRows(filteredRows, target);
    if (target.section === 'asset') {
      const assetCategoryName =
        categories.find((category) => category.code === target.categoryCode)?.name ??
        target.categoryCode ??
        'Other';
      return {
        title: buildPrintTitle(target, assetCategoryName),
        total: all.length,
        makeJob: () =>
          buildPrintJob({ ...base, assetCategoryName, columns: assetPrintColumns(), rows: all, footer: assetFooter(all) }),
        node: (
          <DataTable
            {...tableProps}
            columns={assetTableColumns((row) => setDetail(assetRowDetail(row)))}
            rows={all}
            minWidth="1150px"
          />
        ),
      };
    }

    return {
      title: buildPrintTitle(target, ''),
      total: all.length,
      makeJob: () => buildPrintJob({ ...base, columns: wastePrintColumns(), rows: all, footer: wasteFooter(all) }),
      node: (
        <DataTable
          {...tableProps}
          columns={wasteTableColumns((row) => setDetail(wasteRowDetail(row)))}
          rows={all}
          minWidth="1050px"
        />
      ),
    };
  })();

  const dismissPdfOffer = () => {
    // The offered URL stays valid for a while so "Open PDF" keeps working.
    if (pdfOffer) setTimeout(() => URL.revokeObjectURL(pdfOffer.url), 60000);
    setPdfOffer(null);
  };

  const handleDownload = async (makeJob: () => ReturnType<typeof buildPrintJob>) => {
    setExporting(true);
    try {
      const job = makeJob();
      const blob = await apiService.exportReportPdfBlob(job.payload);
      const url = URL.createObjectURL(blob);
      // Save the file immediately…
      const link = document.createElement('a');
      link.href = url;
      link.download = job.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // …then ask whether to open it (same tab) or stay on this page.
      setPdfOffer({ url, fileName: job.fileName });
    } catch (error: any) {
      toast.error(error?.message || 'PDF export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const openFolder = (folder: HubFolderNode) => {
    if (folder.children && folder.children.length > 0) {
      setTrailIds([...trailIds, folder.id]);
      return;
    }
    if (folder.print && folder.count > 0) {
      setTrailIds([...trailIds, folder.id]);
    }
  };

  const navigateTo = (depth: number) => {
    setTrailIds(depth < 0 ? [] : trailIds.slice(0, depth + 1));
  };

  const rootSection = roots.find((root) => root.id === trail[0]?.id)?.section ?? null;
  const noun: FolderNoun =
    rootSection === 'LEDGER' ? 'sales' : rootSection === 'RECORDS' ? 'records' : 'reports';

  const recordsCount = pointSource.length + leaderboardSource.length + stockSource.length;
  const loading =
    (reportsLoading && filteredRows.length === 0) ||
    (ledgerLoading && ledgerSource.length === 0) ||
    (walkInLoading && walkInSource.length === 0) ||
    (recordsLoading && recordsCount === 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      <ReportsHubFilterBar
        filters={filters}
        onChange={setFilters}
        years={allSchoolYears.map((year) => ({
          id: year.id,
          label: year.label,
          isActive: year.id === activeSchoolYear?.id,
          startDate: year.startDate,
          endDate: year.endDate,
        }))}
        resultCount={
          filteredRows.length +
          filteredLedger.length +
          filteredPoints.length +
          filteredLeaderboard.length +
          filteredStock.length
        }
        gradeOptions={gradeOptions}
        defaultYearId={activeSchoolYear?.id}
      />

      {(degraded || recordsDegraded) && (
        <div className="rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 text-xs font-semibold text-[var(--text-strong)]">
          Some school-year records could not be loaded. Showing the records available offline.
        </div>
      )}

      {currentFolder ? (
        <div className="space-y-4">
          <ReportsBreadcrumbs trail={trail} onNavigate={navigateTo} />
          {loading ? (
            <LoadingState label="Loading folder..." />
          ) : leafView ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-strong)]">{leafView.title}</h2>
                  <p className="text-[11px] text-[var(--text-strong)]/50">
                    {leafView.total} filtered {leafView.total === 1 ? 'record' : 'records'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(leafView.makeJob)}
                  disabled={leafView.total === 0 || exporting}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold shadow-sm hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                >
                  <FileDown size={14} /> {exporting ? 'Preparing…' : 'Download'}
                </button>
              </div>

              {leafView.node}
            </section>
          ) : currentFolder.children && currentFolder.children.length > 0 ? (
            <div className="space-y-2.5">
              {currentFolder.children.map((child) => (
                <ReportFolderRow key={child.id} folder={child} noun={noun} onOpen={openFolder} />
              ))}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl">
              <EmptyState
                icon={<FolderOpen size={22} />}
                title="No folders here yet."
                hint="Folders appear once reports exist for this category."
              />
            </div>
          )}
        </div>
      ) : loading ? (
        <LoadingState label="Loading reports..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {roots.map((root, index) => (
            <ReportFolderTile
              key={root.id}
              folder={root}
              noun={root.section === 'WASTE' || root.section === 'ASSET' ? 'reports' : 'records'}
              rampIndex={index}
              onOpen={openFolder}
            />
          ))}
        </div>
      )}

      <p className="flex items-center gap-2 text-[11px] text-[var(--text-strong)]/45">
        <FolderTree size={13} className="text-[var(--accent)]" />
        Open a folder to see its filtered table, press Back to return to the folders, or Download for the full PDF.
      </p>

      <ConfirmDialog
        open={pdfOffer !== null}
        onOpenChange={(open) => {
          if (!open) dismissPdfOffer();
        }}
        title="PDF downloaded"
        description={`"${pdfOffer?.fileName ?? ''}" was saved to your downloads. Open the PDF in this tab, or stay on this page?`}
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

      <HubRowDetailModal detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
};
