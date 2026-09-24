import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SchoolYear,
  SchoolYearLedger,
  useSchoolYear,
} from '../../../hooks/useSchoolYear';
import { DataTable } from '../../../components/data-table';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { LoadingState } from '../../../components/common/LoadingState';
import { Recycle, Scale, Trophy, Coins, FileText, AlertTriangle } from 'lucide-react';
import { SchoolYearDetailModal } from './SchoolYearDetailModal';
import { EditSchoolYearModal } from './EditSchoolYearModal';
import { buildLedgerSheets, LedgerSheet } from './ledger/ledgerSheets';
import { exportLedgerCsv } from './ledger/exportLedgerCsv';
import { LedgerToolbar } from './ledger/LedgerToolbar';
import { LedgerKpiStrip, LedgerKpi } from './ledger/LedgerKpiStrip';
import { LedgerRowDetailDrawer } from './ledger/LedgerRowDetailDrawer';
import { ledgerStatusClass, num, peso } from './ledger/ledgerFormatters';

interface AdminLedgerPageProps {
  showToast?: (msg: string) => void;
  initialYearId?: string | null;
}

export const AdminLedgerPage: React.FC<AdminLedgerPageProps> = ({ showToast, initialYearId }) => {
  const {
    allSchoolYears,
    activeSchoolYear,
    refresh: refreshYears,
    updateSchoolYear,
    activateSchoolYear,
    importSchoolYears,
    getSchoolYearLedger,
  } = useSchoolYear();

  const [selectedId, setSelectedId] = useState<string | null>(initialYearId ?? null);
  const [ledger, setLedger] = useState<SchoolYearLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState('reports');
  const [search, setSearch] = useState('');

  // Management state
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<SchoolYear | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<{ row: any; sheet: LedgerSheet } | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<SchoolYear | null>(null);

  useEffect(() => {
    if (initialYearId) setSelectedId(initialYearId);
  }, [initialYearId]);

  useEffect(() => {
    if (!selectedId && activeSchoolYear?.id) setSelectedId(activeSchoolYear.id);
  }, [selectedId, activeSchoolYear]);

  const load = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        setLedger(await getSchoolYearLedger(id));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [getSchoolYearLedger],
  );

  useEffect(() => {
    if (selectedId) load(selectedId);
  }, [selectedId, load]);

  const selectedYear = useMemo(
    () =>
      allSchoolYears.find((sy) => sy.id === selectedId) ||
      (activeSchoolYear?.id === selectedId ? activeSchoolYear : null),
    [allSchoolYears, selectedId, activeSchoolYear],
  );

  const handleEdit = async (id: string, data: { label?: string; startDate?: string; endDate?: string }) => {
    await updateSchoolYear(id, data);
    showToast?.('School year updated.');
  };

  const runActivate = async (sy: SchoolYear) => {
    setConfirmActivate(null);
    setActionLoading(sy.id);
    try {
      await activateSchoolYear(sy.id);
      showToast?.(`SY ${sy.label} is now active.`);
    } catch (err: any) {
      showToast?.(`Failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importSchoolYears();
      if (result?.supported === false) {
        showToast?.(result.message || 'EnrollPro does not expose a school-year list. Create years manually.');
      } else {
        showToast?.(result?.message || `Imported school years: ${result?.created ?? 0} created, ${result?.updated ?? 0} updated.`);
      }
    } catch (err: any) {
      showToast?.(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleRefreshAll = async () => {
    await refreshYears();
    if (selectedId) await load(selectedId);
  };

  const sheets = useMemo(() => (ledger ? buildLedgerSheets(ledger) : []), [ledger]);
  const activeSheet = sheets.find((s) => s.id === sheetId) || sheets[0];

  const filteredRows = useMemo(() => {
    if (!activeSheet) return [];
    if (!search.trim()) return activeSheet.rows;
    const q = search.toLowerCase();
    return activeSheet.rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [activeSheet, search]);

  const handleExportCsv = () => {
    if (!activeSheet || !ledger) return;
    exportLedgerCsv(activeSheet, filteredRows, ledger.schoolYear.label);
    showToast?.(`Exported ${activeSheet.label} to CSV`);
  };

  const kpis: LedgerKpi[] = ledger
    ? [
        { label: 'Sales Revenue', value: peso(ledger.market.revenuePhp), icon: Coins, color: 'text-[var(--gold)]' },
        { label: 'Recyclables Sold', value: `${num(ledger.market.soldKg)} kg`, icon: Scale, color: 'text-[var(--accent)]' },
        { label: 'Collected Weight', value: `${num(ledger.reports.collectedWeightKg)} kg`, icon: Recycle, color: 'text-[var(--impact)]' },
        { label: 'Reports', value: num(ledger.reports.total), icon: FileText, color: 'text-[var(--text-strong)]' },
        { label: 'Points Awarded', value: num(ledger.points.totalAwarded), icon: Trophy, color: 'text-[var(--gold)]' },
        { label: 'Students Ranked', value: num(ledger.points.topStudents.length), icon: Trophy, color: 'text-[var(--gold)]' },
      ]
    : [];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="School Years"
        description="Per-year ledger of reports, points, sales, and stock — plus year lifecycle management."
        badge={
          <span className="inline-block text-[10px] font-bold text-[var(--gold)] bg-[var(--gold)]/10 border border-[var(--gold)]/20 px-2.5 py-1 rounded-full uppercase tracking-wider mb-1.5">
            Academic Administration
          </span>
        }
        actions={
          <LedgerToolbar
            years={allSchoolYears}
            selectedId={selectedId}
            onSelectYear={setSelectedId}
            search={search}
            onSearchChange={setSearch}
            importing={importing}
            loading={loading}
            onImport={handleImport}
            onRefresh={handleRefreshAll}
            onExport={handleExportCsv}
            canExport={Boolean(ledger)}
            selectedYear={selectedYear}
            onEdit={() => {
              if (!selectedYear) return;
              setEditTarget(selectedYear);
              setShowEdit(true);
            }}
            onActivate={() => selectedYear && setConfirmActivate(selectedYear)}
            actionLoading={actionLoading === selectedYear?.id}
            onDetails={() => selectedYear && setDetailId(selectedYear.id)}
          />
        }
      />

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800">
            <p className="font-bold">Could not load ledger</p>
            <p className="mt-0.5 text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {loading && !ledger && <LoadingState label="Building ledger…" />}

      {ledger && (
        <>
          <LedgerKpiStrip kpis={kpis} />

          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(ledger.reports.byStatus).map(([status, count]) => (
              <span
                key={status}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border ${ledgerStatusClass(status)}`}
              >
                {status}: {count}
              </span>
            ))}
            <span className="text-[10px] text-[var(--text-strong)]/30 font-bold">|</span>
            {Object.entries(ledger.reports.byCategory).map(([cat, count]) => (
              <span
                key={cat}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-white text-[var(--text-strong)]/60 border border-[var(--primary)]/10"
              >
                {cat}: {count}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sheets.map((s) => {
              const isActive = s.id === activeSheet?.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSheetId(s.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'bg-white border border-[var(--primary)]/10 text-[var(--text-strong)]/60 hover:bg-[var(--primary)]/5'
                  }`}
                >
                  <Icon size={13} className={isActive ? 'text-[var(--accent)]' : ''} />
                  {s.label}
                  <span
                    className={`ml-1 px-1.5 rounded-full text-[9px] ${
                      isActive ? 'bg-white/15 text-white' : 'bg-[var(--primary)]/10 text-[var(--text-strong)]/50'
                    }`}
                  >
                    {s.rows.length}
                  </span>
                </button>
              );
            })}
          </div>

          {activeSheet && (
            <DataTable
              columns={activeSheet.columns}
              rows={filteredRows}
              rowKey={(row, index) => row.id || String(index)}
              minWidth={activeSheet.minWidth}
              title={activeSheet.label}
              description={`${filteredRows.length} records found${
                activeSheet.id === 'reports' && ledger.reports.rowsTruncated ? ' (capped at 1000)' : ''
              } · click a column header to sort`}
              emptyTitle={search ? 'No rows match your search.' : 'No records for this sheet.'}
              onRowClick={(row) => setViewRow({ row, sheet: activeSheet })}
            />
          )}
        </>
      )}

      <LedgerRowDetailDrawer view={viewRow} onClose={() => setViewRow(null)} />

      <EditSchoolYearModal
        isOpen={showEdit}
        schoolYear={editTarget}
        onClose={() => {
          setShowEdit(false);
          setEditTarget(null);
        }}
        onSubmit={handleEdit}
      />

      <SchoolYearDetailModal schoolYearId={detailId} onClose={() => setDetailId(null)} />

      <ConfirmDialog
        open={confirmActivate !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmActivate(null);
        }}
        title="Activate school year?"
        description={
          confirmActivate
            ? `Activate SY ${confirmActivate.label}? This will deactivate the current active year.`
            : undefined
        }
        confirmLabel="Activate"
        onConfirm={() => confirmActivate && runActivate(confirmActivate)}
      />
    </div>
  );
};
