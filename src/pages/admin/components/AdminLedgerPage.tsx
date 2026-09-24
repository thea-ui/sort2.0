import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSchoolYear, SchoolYearLedger, LedgerReportRow, LedgerPointTxn, SchoolYear } from '../../../hooks/useSchoolYear';
import { LedgerSheetTable, SheetColumn } from './LedgerSheetTable';
import { SchoolYearDetailModal } from './SchoolYearDetailModal';
import { EditSchoolYearModal } from './EditSchoolYearModal';
import {
  FileSpreadsheet,
  RefreshCw,
  Download,
  Search,
  Coins,
  Scale,
  Recycle,
  FileText,
  Trophy,
  Boxes,
  AlertTriangle,
  CalendarClock,
  Upload,
  Pencil,
  Power,
  ChevronRight,
  X,
} from 'lucide-react';

interface AdminLedgerPageProps {
  showToast?: (msg: string) => void;
  initialYearId?: string | null;
}

const peso = (n: number) =>
  `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const shortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  DISPATCHED: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25',
  COLLECTED: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISMISSED: 'bg-gray-100 text-gray-500 border-gray-200',
  EXPIRED: 'bg-rose-50 text-rose-600 border-rose-200',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
    {status}
  </span>
);

const VIEW_COLUMN: SheetColumn<any> = {
  key: 'view',
  label: '',
  align: 'right',
  width: '52px',
  render: () => (
    <span className="inline-flex items-center justify-end gap-1 text-[10px] font-bold text-[var(--accent)]">
      View <ChevronRight size={13} />
    </span>
  ),
};

const MetricCell: React.FC<{ value: number; status: string }> = ({ value, status }) => {
  if (value > 0) return <span className="font-semibold">{num(value)}</span>;
  const label =
    status === 'PENDING' ? 'Awaiting'
    : status === 'DISPATCHED' ? 'In transit'
    : '—';
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider ${label === '—' ? 'text-[var(--text-strong)]/20' : 'text-[var(--text-strong)]/35'}`}>
      {label}
    </span>
  );
};

interface LedgerSheet {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  columns: SheetColumn<any>[];
  rows: any[];
  minWidth?: string;
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

  useEffect(() => {
    if (initialYearId) setSelectedId(initialYearId);
  }, [initialYearId]);

  useEffect(() => {
    if (!selectedId && activeSchoolYear?.id) setSelectedId(activeSchoolYear.id);
  }, [selectedId, activeSchoolYear]);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      setLedger(await getSchoolYearLedger(id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getSchoolYearLedger]);

  useEffect(() => {
    if (selectedId) load(selectedId);
  }, [selectedId, load]);

  const selectedYear = useMemo(
    () => allSchoolYears.find((sy) => sy.id === selectedId) || (activeSchoolYear?.id === selectedId ? activeSchoolYear : null),
    [allSchoolYears, selectedId, activeSchoolYear]
  );

  // ── Management handlers ──────────────────────────────────────────────

  const handleEdit = async (id: string, data: { label?: string; startDate?: string; endDate?: string }) => {
    await updateSchoolYear(id, data);
    showToast?.('School year updated.');
  };

  const handleActivate = async (sy: SchoolYear) => {
    if (!window.confirm(`Activate SY ${sy.label}? This will deactivate the current active year.`)) return;
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

  // ── Ledger sheets ────────────────────────────────────────────────────

  const sheets: LedgerSheet[] = useMemo(() => {
    if (!ledger) return [];
    const L = ledger;

    const reportCols: SheetColumn<LedgerReportRow>[] = [
      { key: 'date', label: 'Date', value: (r) => r.createdAt, render: (r) => <span className="whitespace-nowrap">{shortDate(r.createdAt)}</span> },
      { key: 'title', label: 'Report', value: (r) => r.title, render: (r) => <span className="font-bold">{r.title}</span> },
      {
        key: 'reporter', label: 'Reporter', value: (r) => r.reporterName,
        render: (r) => (
          <div className="leading-tight">
            <span className="font-semibold">{r.reporterName}</span>
            {r.gradeLevel && <span className="block text-[10px] text-gray-400">{r.gradeLevel}{r.sectionName ? ` · ${r.sectionName}` : ''}</span>}
          </div>
        ),
      },
      { key: 'location', label: 'Location', value: (r) => r.locationName },
      { key: 'category', label: 'Category', value: (r) => r.category },
      { key: 'status', label: 'Status', value: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
      { key: 'urgency', label: 'Urgency', align: 'center', value: (r) => r.urgency },
      { key: 'weight', label: 'Weight (kg)', align: 'right', value: (r) => r.weightCollected, render: (r) => <MetricCell value={r.weightCollected} status={r.status} />, total: (rows) => num(rows.reduce((s, r) => s + r.weightCollected, 0)) },
      { key: 'points', label: 'Points', align: 'right', value: (r) => r.pointsAwarded, render: (r) => <MetricCell value={r.pointsAwarded} status={r.status} />, total: (rows) => num(rows.reduce((s, r) => s + r.pointsAwarded, 0)) },
    ];

    const pointCols: SheetColumn<LedgerPointTxn>[] = [
      { key: 'date', label: 'Date', value: (p) => p.createdAt, render: (p) => <span className="whitespace-nowrap">{shortDate(p.createdAt)}</span> },
      {
        key: 'student', label: 'Student', value: (p) => p.userName,
        render: (p) => (
          <div className="leading-tight">
            <span className="font-semibold">{p.userName}</span>
            {p.gradeLevel && <span className="block text-[10px] text-gray-400">{p.gradeLevel}</span>}
          </div>
        ),
      },
      { key: 'reason', label: 'Reason', value: (p) => p.reason },
      {
        key: 'amount', label: 'Amount', align: 'right', value: (p) => p.amount,
        render: (p) => <span className={p.amount >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{p.amount > 0 ? '+' : ''}{p.amount}</span>,
        total: (rows) => num(rows.reduce((s, r) => s + r.amount, 0)),
      },
    ];

    return [
      { id: 'reports', label: 'Reports', icon: FileText, columns: [...reportCols, VIEW_COLUMN] as SheetColumn<any>[], rows: L.reports.rows, minWidth: '1100px' },
      { id: 'points', label: 'Points Ledger', icon: Coins, columns: [...pointCols, VIEW_COLUMN] as SheetColumn<any>[], rows: L.points.transactions, minWidth: '720px' },
      {
        id: 'leaderboard', label: 'Leaderboard', icon: Trophy, minWidth: '640px',
        columns: [
          { key: 'rank', label: 'Rank', align: 'center', value: (s: any) => s.rank },
          { key: 'name', label: 'Student', value: (s: any) => s.name, render: (s: any) => <span className="font-bold">{s.name}</span> },
          { key: 'grade', label: 'Grade', value: (s: any) => s.gradeLevel || '' },
          { key: 'section', label: 'Section', value: (s: any) => s.sectionName || '' },
          { key: 'points', label: 'Closing Points', align: 'right', value: (s: any) => s.closingPoints, total: (rows: any[]) => num(rows.reduce((a, r) => a + r.closingPoints, 0)) },
          VIEW_COLUMN,
        ] as SheetColumn<any>[],
        rows: L.points.topStudents,
      },
      {
        id: 'sales', label: 'Market Sales', icon: Scale, minWidth: '820px',
        columns: [
          { key: 'date', label: 'Date', value: (t: any) => t.soldAt, render: (t: any) => <span className="whitespace-nowrap">{shortDate(t.soldAt)}</span> },
          { key: 'category', label: 'Category', value: (t: any) => t.categoryName, render: (t: any) => <span className="font-bold">{t.categoryName}</span> },
          { key: 'kg', label: 'Weight (kg)', align: 'right', value: (t: any) => t.weightKg, total: (rows: any[]) => num(rows.reduce((a, r) => a + r.weightKg, 0)) },
          { key: 'price', label: '₱/kg', align: 'right', value: (t: any) => t.marketPriceKg },
          { key: 'revenue', label: 'Revenue', align: 'right', value: (t: any) => t.totalRevenue, render: (t: any) => peso(t.totalRevenue), total: (rows: any[]) => peso(rows.reduce((a, r) => a + r.totalRevenue, 0)) },
          { key: 'buyer', label: 'Buyer', value: (t: any) => t.buyerName },
          VIEW_COLUMN,
        ] as SheetColumn<any>[],
        rows: L.market.sales,
      },
      {
        id: 'stock', label: 'Market Stock', icon: Boxes, minWidth: '620px',
        columns: [
          { key: 'category', label: 'Category', value: (s: any) => s.categoryName, render: (s: any) => <span className="font-bold">{s.categoryName}</span> },
          { key: 'opening', label: 'Opening (kg)', align: 'right', value: (s: any) => s.openingKg, total: (rows: any[]) => num(rows.reduce((a, r) => a + r.openingKg, 0)) },
          { key: 'closing', label: 'Closing (kg)', align: 'right', value: (s: any) => s.closingKg, total: (rows: any[]) => num(rows.reduce((a, r) => a + r.closingKg, 0)) },
          { key: 'net', label: 'Net (kg)', align: 'right', value: (s: any) => s.closingKg - s.openingKg, render: (s: any) => num(s.closingKg - s.openingKg) },
          VIEW_COLUMN,
        ] as SheetColumn<any>[],
        rows: L.market.snapshots,
      },
    ];
  }, [ledger]);

  const activeSheet = sheets.find((s) => s.id === sheetId) || sheets[0];

  const filteredRows = useMemo(() => {
    if (!activeSheet) return [];
    if (!search.trim()) return activeSheet.rows;
    const q = search.toLowerCase();
    return activeSheet.rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [activeSheet, search]);

  const exportCsv = () => {
    if (!activeSheet || !ledger) return;
    const exportCols = activeSheet.columns.filter((c) => c.key !== 'view');
    const headers = exportCols.map((c) => c.label);
    const lines = [headers.join(',')];
    for (const row of filteredRows) {
      lines.push(
        exportCols
          .map((c) => {
            const raw = c.value ? c.value(row) : '';
            const s = String(raw ?? '');
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(',')
      );
    }
    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SORT_Ledger_${ledger.schoolYear.label}_${activeSheet.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.(`Exported ${activeSheet.label} to CSV`);
  };

  const kpis = ledger
    ? [
        { label: 'Sales Revenue', value: peso(ledger.market.revenuePhp), icon: Coins, color: 'text-[var(--gold)]' },
        { label: 'Recyclables Sold', value: `${num(ledger.market.soldKg)} kg`, icon: Scale, color: 'text-[var(--accent)]' },
        { label: 'Collected Weight', value: `${num(ledger.reports.collectedWeightKg)} kg`, icon: Recycle, color: 'text-[#10B981]' },
        { label: 'Reports', value: num(ledger.reports.total), icon: FileText, color: 'text-[var(--text-strong)]' },
        { label: 'Points Awarded', value: num(ledger.points.totalAwarded), icon: Trophy, color: 'text-[var(--gold)]' },
        { label: 'Students Ranked', value: num(ledger.points.topStudents.length), icon: Trophy, color: 'text-[var(--gold)]' },
      ]
    : [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-[var(--gold)] bg-[var(--gold)]/10 border border-[var(--gold)]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Academic Administration
          </span>
          <h3 className="text-2xl font-heading font-black text-[var(--text-strong)] tracking-tight mt-1.5 flex items-center gap-2">
            <FileSpreadsheet size={24} className="text-[var(--gold)]" />
            School Years
          </h3>
          <p className="text-xs text-[var(--text-strong)]/50 mt-0.5">
            Per-year ledger of reports, points, sales, and stock — plus year lifecycle management.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <CalendarClock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-strong)]/40 pointer-events-none" />
            <select
              value={selectedId || ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="pl-8 pr-8 py-2 rounded-xl border border-[var(--primary)]/10 bg-white text-xs font-bold text-[var(--text-strong)] outline-none focus:border-[var(--accent)] cursor-pointer appearance-none"
              aria-label="Select school year"
            >
              {allSchoolYears.map((sy) => (
                <option key={sy.id} value={sy.id}>
                  SY {sy.label}{sy.isActive ? ' (Active)' : sy.isArchived ? ' (Archived)' : ' (Inactive)'}
                </option>
              ))}
              {allSchoolYears.length === 0 && <option value="">No school years</option>}
            </select>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-strong)]/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rows…"
              className="pl-8 pr-3 py-2 rounded-xl border border-[var(--primary)]/10 bg-white text-xs text-[var(--text-strong)] outline-none focus:border-[var(--accent)] w-44"
            />
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="px-3 py-2 rounded-xl bg-white border border-[var(--primary)]/10 text-xs font-bold text-[var(--text-strong)]/70 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Fetch all school years from EnrollPro (sync only — never activates or rolls over)"
          >
            <Upload size={13} className={importing ? 'animate-pulse' : ''} /> Sync
          </button>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white border border-[var(--primary)]/10 text-xs font-bold text-[var(--text-strong)]/70 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            type="button"
            onClick={exportCsv}
            disabled={!ledger}
            className="px-3 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download size={13} /> Export CSV
          </button>

          {selectedYear && !selectedYear.isActive && !selectedYear.isArchived && (
            <button
              type="button"
              onClick={() => { setEditTarget(selectedYear); setShowEdit(true); }}
              className="px-3 py-2 rounded-xl bg-white border border-[var(--primary)]/10 text-xs font-bold text-[var(--text-strong)]/70 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil size={13} /> Edit
            </button>
          )}

          {selectedYear && !selectedYear.isActive && !selectedYear.isArchived && (
            <button
              type="button"
              onClick={() => handleActivate(selectedYear)}
              disabled={actionLoading === selectedYear.id}
              className="px-3 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Power size={13} /> Activate
            </button>
          )}

          <button
            type="button"
            onClick={() => selectedYear && setDetailId(selectedYear.id)}
            disabled={!selectedYear}
            className="px-3 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
          >
            <FileSpreadsheet size={13} /> Details
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800">
            <p className="font-bold">Could not load ledger</p>
            <p className="mt-0.5 text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {loading && !ledger && (
        <div className="py-20 text-center">
          <RefreshCw size={22} className="mx-auto text-gray-300 animate-spin" />
          <p className="text-xs text-gray-400 mt-2">Building ledger…</p>
        </div>
      )}

      {ledger && (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white border border-gray-100 rounded-2xl p-4">
                <k.icon size={17} className={k.color} />
                <p className="text-lg font-black text-[var(--text-strong)] mt-2 leading-none">{k.value}</p>
                <p className="text-[10px] font-bold text-[var(--text-strong)]/45 uppercase tracking-wider mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Breakdown chips */}
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(ledger.reports.byStatus).map(([status, count]) => (
              <span key={status} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {status}: {count}
              </span>
            ))}
            <span className="text-[10px] text-[var(--text-strong)]/30 font-bold">|</span>
            {Object.entries(ledger.reports.byCategory).map(([cat, count]) => (
              <span key={cat} className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-white text-[var(--text-strong)]/60 border border-[var(--primary)]/10">
                {cat}: {count}
              </span>
            ))}
          </div>

          {/* Workbook */}
          <div className="rounded-3xl border border-[var(--primary)]/10 bg-white shadow-sm overflow-hidden">
            {/* Sheet tabs */}
            <div className="flex items-center gap-1 px-3 pt-3 border-b border-[var(--primary)]/10 overflow-x-auto bg-[var(--background)]/50">
              {sheets.map((s) => {
                const isActive = s.id === activeSheet?.id;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSheetId(s.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                      isActive
                        ? 'bg-white text-[var(--text-strong)] border-[var(--accent)]'
                        : 'text-[var(--text-strong)]/45 border-transparent hover:text-[var(--text-strong)] hover:bg-white/50'
                    }`}
                  >
                    <Icon size={13} className={isActive ? 'text-[var(--accent)]' : ''} />
                    {s.label}
                    <span className={`ml-1 px-1.5 rounded-full text-[9px] ${isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-gray-100 text-gray-400'}`}>
                      {s.rows.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sheet toolbar */}
            <div className="flex items-center justify-between px-5 py-3 text-xs bg-white border-b border-gray-100">
              <span className="text-sm font-bold text-[var(--text-strong)] flex items-center gap-2">
                {activeSheet?.label}
                <span className="text-xs font-normal text-slate-400">
                  {filteredRows.length} records found
                  {activeSheet?.id === 'reports' && ledger.reports.rowsTruncated && ' (capped at 1000)'}
                </span>
              </span>
              <span className="text-[11px] font-medium text-slate-400">Click a column header to sort</span>
            </div>

            {/* Grid */}
            {activeSheet && (
              <LedgerSheetTable
                columns={activeSheet.columns}
                rows={filteredRows}
                getRowId={(row, i) => row.id || String(i)}
                minWidth={activeSheet.minWidth}
                emptyMessage={search ? 'No rows match your search.' : 'No records for this sheet.'}
                borderless
                onRowClick={(row) => setViewRow({ row, sheet: activeSheet })}
              />
            )}
          </div>
        </>
      )}

      {/* ── Row Details Drawer ── */}
      {viewRow && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end" onClick={() => setViewRow(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                    {viewRow.sheet.label}
                  </span>
                  <h3 className="text-lg font-heading font-black mt-0.5 truncate">
                    Ledger Record
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setViewRow(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 flex-1 overflow-y-auto">
              {viewRow.sheet.columns.filter((c) => c.key !== 'view').map((col) => {
                const raw = col.value ? col.value(viewRow.row) : '';
                const content = col.render
                  ? col.render(viewRow.row)
                  : raw === '' || raw == null ? '—' : String(raw);
                return (
                  <div key={col.key} className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
                    <span className="text-[10px] font-bold text-[var(--text-strong)]/45 uppercase tracking-wider shrink-0 pt-0.5">
                      {col.label}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-strong)] text-right break-words">
                      {content ?? '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modals ── */}
      <EditSchoolYearModal
        isOpen={showEdit}
        schoolYear={editTarget}
        onClose={() => { setShowEdit(false); setEditTarget(null); }}
        onSubmit={handleEdit}
      />

      <SchoolYearDetailModal
        schoolYearId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
};
