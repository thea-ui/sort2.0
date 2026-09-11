import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService } from '../../../services/api';
import { useSchoolYear } from '../../../hooks/useSchoolYear';
import { LedgerSheetTable, SheetColumn } from '../../admin/components/LedgerSheetTable';
import {
  FileSpreadsheet,
  RefreshCw,
  Download,
  Search,
  Plus,
  Wrench,
  PackageCheck,
  Trash2,
  AlertTriangle,
  CalendarClock,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface MRFAssetLedgerPageProps {
  showToast: (msg: string) => void;
}

interface AssetRecord {
  id: string;
  assetName: string;
  category: string;
  action: string;
  quantity: number;
  unit: string;
  condition?: string;
  sourceReportId?: string;
  locationName?: string;
  notes?: string;
  performedBy?: string;
  createdAt: string;
}

interface AssetSummary {
  total: number;
  byAction: { action: string; _count: { _all: number }; _sum: { quantity: number | null } }[];
  byCategory: { category: string; _count: { _all: number } }[];
}

const ACTION_META: Record<string, { label: string; badge: string }> = {
  RECOVERED: { label: 'Recovered', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REPAIRED: { label: 'Repaired', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  DISPOSED: { label: 'Disposed', badge: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const CATEGORIES = ['Furniture', 'Electronics', 'Fixtures', 'Equipment', 'Other'];
const CONDITIONS = ['GOOD', 'FAIR', 'NEEDS_REPAIR', 'DISPOSED'];

const shortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
const num = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export const MRFAssetLedgerPage: React.FC<MRFAssetLedgerPageProps> = ({ showToast }) => {
  const { allSchoolYears, activeSchoolYear } = useSchoolYear();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [records, setRecords] = useState<AssetRecord[]>([]);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    assetName: '',
    category: 'Furniture',
    action: 'RECOVERED',
    quantity: '1',
    unit: 'pcs',
    condition: 'NEEDS_REPAIR',
    sourceReportId: '',
    locationName: '',
    notes: '',
  });

  useEffect(() => {
    if (!selectedId && activeSchoolYear?.id) setSelectedId(activeSchoolYear.id);
  }, [selectedId, activeSchoolYear]);

  const load = useCallback(async (schoolYearId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [recs, summ] = await Promise.all([
        apiService.getAssetRecords({ schoolYearId }),
        apiService.getAssetSummary(schoolYearId),
      ]);
      setRecords(recs || []);
      setSummary(summ || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load asset ledger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) load(selectedId);
  }, [selectedId, load]);

  const filteredRecords = useMemo(() => {
    let rows = records;
    if (actionFilter !== 'ALL') rows = rows.filter((r) => r.action === actionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    }
    return rows;
  }, [records, actionFilter, search]);

  const columns: SheetColumn<AssetRecord>[] = useMemo(() => [
    { key: 'date', label: 'Date', value: (r) => r.createdAt, render: (r) => shortDate(r.createdAt) },
    { key: 'asset', label: 'Asset', value: (r) => r.assetName, render: (r) => <span className="font-bold">{r.assetName}</span> },
    { key: 'category', label: 'Category', value: (r) => r.category },
    {
      key: 'action', label: 'Action', value: (r) => ACTION_META[r.action]?.label || r.action,
      render: (r) => (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${ACTION_META[r.action]?.badge || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          {ACTION_META[r.action]?.label || r.action}
        </span>
      ),
    },
    { key: 'qty', label: 'Qty', align: 'right', value: (r) => r.quantity, total: (rows) => num(rows.reduce((s, r) => s + r.quantity, 0)) },
    { key: 'unit', label: 'Unit', value: (r) => r.unit },
    { key: 'condition', label: 'Condition', value: (r) => r.condition || '' },
    { key: 'source', label: 'Source Report', value: (r) => r.sourceReportId || '' },
    { key: 'location', label: 'Location', value: (r) => r.locationName || '' },
    { key: 'notes', label: 'Notes', value: (r) => r.notes || '' },
    { key: 'by', label: 'Performed By', value: (r) => r.performedBy || '' },
  ], []);

  const exportCsv = () => {
    if (filteredRecords.length === 0) return;
    const headers = columns.map((c) => c.label);
    const lines = [headers.join(',')];
    for (const row of filteredRecords) {
      lines.push(
        columns
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
    a.download = `SORT_MRF_AssetLedger_${allSchoolYears.find((sy) => sy.id === selectedId)?.label || ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported asset ledger to CSV');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetName.trim() || !form.category || !form.action) return;
    setSaving(true);
    try {
      await apiService.createAssetRecord({
        assetName: form.assetName.trim(),
        category: form.category,
        action: form.action,
        quantity: parseFloat(form.quantity) || 1,
        unit: form.unit || 'pcs',
        condition: form.condition || undefined,
        sourceReportId: form.sourceReportId.trim() || undefined,
        locationName: form.locationName.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      showToast(`Asset recorded as ${ACTION_META[form.action]?.label || form.action}.`);
      setShowModal(false);
      setForm({ assetName: '', category: 'Furniture', action: 'RECOVERED', quantity: '1', unit: 'pcs', condition: 'NEEDS_REPAIR', sourceReportId: '', locationName: '', notes: '' });
      if (selectedId) load(selectedId);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const kpis = summary
    ? [
        { label: 'Total Records', value: num(summary.total), icon: FileSpreadsheet, color: 'text-[#00A77C]' },
        ...['RECOVERED', 'REPAIRED', 'DISPOSED'].map((act) => {
          const row = summary.byAction.find((a) => a.action === act);
          const meta = ACTION_META[act];
          const icon = act === 'RECOVERED' ? PackageCheck : act === 'REPAIRED' ? Wrench : Trash2;
          const color = act === 'RECOVERED' ? 'text-emerald-600' : act === 'REPAIRED' ? 'text-sky-600' : 'text-gray-500';
          return {
            label: meta?.label || act,
            value: `${num(row?._count._all || 0)} (${num(row?._sum.quantity || 0)} pcs)`,
            icon,
            color,
          };
        }),
      ]
    : [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header + Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
            MRF Asset Lifecycle
          </span>
          <h3 className="text-2xl font-heading font-black text-[#00271D] tracking-tight mt-1.5 flex items-center gap-2">
            <FileSpreadsheet size={24} className="text-[#00A77C]" />
            Asset Ledger
          </h3>
          <p className="text-xs text-[#00271D]/50 mt-0.5">
            Compiled ledger of recovered, repaired, and disposed assets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <CalendarClock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00271D]/40" />
            <select
              value={selectedId || ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="pl-8 pr-8 py-2 rounded-xl border border-[#00271D]/10 bg-white text-xs font-bold text-[#00271D] outline-none focus:border-[#00A77C] cursor-pointer appearance-none"
            >
              {allSchoolYears.map((sy) => (
                <option key={sy.id} value={sy.id}>SY {sy.label}{sy.isActive ? ' (Active)' : sy.isArchived ? ' (Archived)' : ''}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#00271D]/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rows…"
              className="pl-8 pr-3 py-2 rounded-xl border border-[#00271D]/10 bg-white text-xs text-[#00271D] outline-none focus:border-[#00A77C] w-44"
            />
          </div>

          <button
            type="button"
            onClick={() => selectedId && load(selectedId)}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white border border-[#00271D]/10 text-xs font-bold text-[#00271D]/70 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredRecords.length === 0}
            className="px-3 py-2 rounded-xl bg-[#00A77C] hover:bg-[#008f6a] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download size={13} /> Export CSV
          </button>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-3 py-2 rounded-xl bg-[#00271D] hover:bg-[#003a2b] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus size={13} /> Record Asset
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700 font-semibold">{error}</p>
        </div>
      )}

      {loading && !summary ? (
        <div className="py-20 text-center">
          <RefreshCw size={22} className="mx-auto text-gray-300 animate-spin" />
          <p className="text-xs text-gray-400 mt-2">Loading asset ledger…</p>
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white border border-gray-100 rounded-2xl p-4">
                <k.icon size={17} className={k.color} />
                <p className="text-lg font-black text-[#00271D] mt-2 leading-none">{k.value}</p>
                <p className="text-[10px] font-bold text-[#00271D]/45 uppercase tracking-wider mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Action filter tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'RECOVERED', 'REPAIRED', 'DISPOSED'].map((act) => (
              <button
                key={act}
                type="button"
                onClick={() => setActionFilter(act)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                  actionFilter === act
                    ? 'bg-[#00271D] text-white border-[#00271D]'
                    : 'bg-white text-[#00271D]/60 border-[#00271D]/10 hover:bg-gray-50'
                }`}
              >
                {act === 'ALL' ? `All (${summary?.total || 0})` : `${ACTION_META[act]?.label || act} (${summary?.byAction.find((a) => a.action === act)?._count._all || 0})`}
              </button>
            ))}
          </div>

          {/* Workbook */}
          <div className="rounded-3xl border border-[#00271D]/10 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 text-xs bg-white border-b border-gray-100">
              <span className="text-sm font-bold text-[#00271D] flex items-center gap-2">
                Asset Records
                <span className="text-xs font-normal text-slate-400">{filteredRecords.length} records found</span>
              </span>
              <span className="text-[11px] font-medium text-slate-400">Click a column header to sort</span>
            </div>
            <LedgerSheetTable
              columns={columns}
              rows={filteredRecords}
              getRowId={(row) => row.id}
              minWidth="1100px"
              emptyMessage="No asset records yet. Click 'Record Asset' to log recovered, repaired, or disposed assets."
              borderless
            />
          </div>
        </>
      )}

      {/* Record Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden max-h-[88vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-[#00271D] to-[#003a2b] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div>
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Asset Lifecycle</span>
                <h3 className="text-lg font-bold text-white">Record Asset</h3>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 text-white/40 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asset Name *</label>
                <input type="text" required value={form.assetName} onChange={(e) => setForm({ ...form, assetName: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#00A77C]" placeholder="e.g. Broken classroom chair" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#00A77C] cursor-pointer">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action *</label>
                  <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#00A77C] cursor-pointer">
                    {['RECOVERED', 'REPAIRED', 'DISPOSED'].map((a) => <option key={a} value={a}>{ACTION_META[a]?.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quantity</label>
                  <input type="number" step="0.1" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#00A77C]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unit</label>
                  <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#00A77C]" placeholder="pcs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Condition</label>
                  <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#00A77C] cursor-pointer">
                    {CONDITIONS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</label>
                <input type="text" value={form.locationName} onChange={(e) => setForm({ ...form, locationName: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#00A77C]" placeholder="e.g. Science Hall" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Source Report ID (optional)</label>
                <input type="text" value={form.sourceReportId} onChange={(e) => setForm({ ...form, sourceReportId: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[#00A77C]" placeholder="Report #" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none resize-none focus:border-[#00A77C]" placeholder="Optional notes" />
              </div>

              <button type="submit" disabled={saving} className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00A77C] to-[#008f6a] text-white text-xs font-bold shadow-lg shadow-[#00A77C]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {saving ? 'Recording…' : 'Record Asset'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};