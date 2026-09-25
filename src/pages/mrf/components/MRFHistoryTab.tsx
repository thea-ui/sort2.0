import React, { useMemo, useState } from 'react';
import { Report } from '../../../types';
import { LedgerSheetTable, SheetColumn } from '../../admin/components/LedgerSheetTable';
import { cleanReportTitle, cleanLocationName, getReportTimestampMs } from '../../../utils/reportUtils';
import { History, PackageCheck, Scale, Wrench, Recycle, Armchair, Inbox } from 'lucide-react';

interface MRFHistoryTabProps {
  reports: Report[];
}

type TypeFilter = 'ALL' | 'RECYCLABLE' | 'ASSET';

function isAssetReport(rep: Report): boolean {
  const d = rep.description.toUpperCase();
  return (
    rep.reportType === 'ASSET' ||
    d.includes('FURNITURE') ||
    d.includes('ELECTRONICS') ||
    d.includes('FIXTURES') ||
    d.includes('EQUIPMENT')
  );
}

function getCompletedMs(rep: Report): number {
  return getReportTimestampMs(rep.completedAt) || getReportTimestampMs(rep.timestamp);
}

function formatCompleted(rep: Report): string {
  const ms = getCompletedMs(rep);
  if (!ms) return '—';
  const date = new Date(ms);
  return (
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
}

export const MRFHistoryTab: React.FC<MRFHistoryTabProps> = ({ reports }) => {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const completedDispatches = useMemo(
    () =>
      reports
        .filter((r) => r.status === 'COLLECTED' || r.status === 'RESOLVED')
        .sort((a, b) => getCompletedMs(b) - getCompletedMs(a)),
    [reports]
  );

  const totalKgCollected = useMemo(
    () => completedDispatches.reduce((sum, r) => sum + (r.weightCollected || 0), 0),
    [completedDispatches]
  );

  const totalAssetsProcessed = useMemo(
    () => completedDispatches.filter(isAssetReport).length,
    [completedDispatches]
  );

  const recyclableCount = completedDispatches.length - totalAssetsProcessed;

  const filtered = useMemo(() => {
    if (typeFilter === 'ALL') return completedDispatches;
    if (typeFilter === 'ASSET') return completedDispatches.filter(isAssetReport);
    return completedDispatches.filter((r) => !isAssetReport(r));
  }, [completedDispatches, typeFilter]);

  const columns = useMemo<SheetColumn<Report>[]>(
    () => [
      {
        key: 'item',
        label: 'Item',
        value: (r) => cleanReportTitle(r.title),
        render: (r) => (
          <span className="font-bold text-[var(--text-strong)]">{cleanReportTitle(r.title)}</span>
        ),
      },
      {
        key: 'location',
        label: 'Location',
        value: (r) => cleanLocationName(r.locationName),
        render: (r) => (
          <span className="text-[var(--text-strong)]/70 font-medium">{cleanLocationName(r.locationName)}</span>
        ),
      },
      {
        key: 'reporter',
        label: 'Reporter',
        value: (r) => r.reporterName || '—',
        render: (r) => <span className="text-[var(--text-strong)]/70 font-medium">{r.reporterName || '—'}</span>,
      },
      {
        key: 'type',
        label: 'Type',
        value: (r) => (isAssetReport(r) ? 'Asset' : 'Recyclable'),
        render: (r) =>
          isAssetReport(r) ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border bg-amber-50 text-amber-700 border-amber-200">
              <Armchair size={11} /> Asset
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border bg-emerald-50 text-emerald-700 border-emerald-200">
              <Recycle size={11} /> Recyclable
            </span>
          ),
      },
      {
        key: 'completed',
        label: 'Completed',
        value: (r) => getCompletedMs(r),
        render: (r) => <span className="text-[var(--text-strong)]/60 font-medium whitespace-nowrap">{formatCompleted(r)}</span>,
      },
      {
        key: 'weight',
        label: 'Result',
        align: 'right',
        value: (r) => r.weightCollected || 0,
        render: (r) =>
          r.weightCollected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-black text-[11px] whitespace-nowrap">
              <Scale size={11} /> {r.weightCollected} kg
            </span>
          ) : (
            <span className="inline-flex px-3 py-1 bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)] border border-[var(--primary)]/25 rounded-full font-black text-[10px] uppercase whitespace-nowrap">
              Done / Finished
            </span>
          ),
      },
    ],
    []
  );

  const FILTERS: { key: TypeFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: completedDispatches.length },
    { key: 'RECYCLABLE', label: 'Recyclables', count: recyclableCount },
    { key: 'ASSET', label: 'Assets', count: totalAssetsProcessed },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[var(--accent)] mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed Jobs</span>
            <PackageCheck size={18} />
          </div>
          <p className="text-3xl font-black text-[var(--text-strong)]">{completedDispatches.length}</p>
          <p className="text-[11px] font-semibold text-[var(--accent)]">Dispatches finished</p>
        </div>

        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recyclables Gathered</span>
            <Scale size={18} />
          </div>
          <p className="text-3xl font-black text-[var(--text-strong)]">
            {totalKgCollected} <span className="text-base font-normal">kg</span>
          </p>
          <p className="text-[11px] font-semibold text-emerald-600">Total weight logged</p>
        </div>

        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assets Handled</span>
            <Wrench size={18} />
          </div>
          <p className="text-3xl font-black text-[var(--text-strong)]">{totalAssetsProcessed}</p>
          <p className="text-[11px] font-semibold text-amber-600">Asset tasks processed</p>
        </div>
      </div>

      {/* History Log Table */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-heading font-bold text-[var(--text-strong)] flex items-center gap-2">
            <History size={16} className="text-[var(--accent)]" />
            <span>MRF Collection Ledger &amp; Log History</span>
          </h3>
          <span className="text-[11px] font-medium text-slate-400">Click a column header to sort</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                typeFilter === f.key
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-white text-[var(--text-strong)]/70 border-[var(--primary)]/10 hover:bg-[var(--background)]'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 ${typeFilter === f.key ? 'text-white/70' : 'text-gray-400'}`}>{f.count}</span>
            </button>
          ))}
        </div>

        {completedDispatches.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Inbox size={24} className="mx-auto text-gray-300" />
            <p className="text-xs text-gray-400">No completed collection logs yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--primary)]/10 overflow-hidden">
            <LedgerSheetTable
              columns={columns}
              rows={filtered}
              getRowId={(row) => row.id}
              minWidth="880px"
              emptyMessage="No records match this filter."
              borderless
            />
          </div>
        )}
      </div>
    </div>
  );
};
