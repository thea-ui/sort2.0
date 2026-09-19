import React, { useMemo, useState } from 'react';
import { History, PackageCheck, Coins, ShieldAlert, Scale, Inbox } from 'lucide-react';
import type { ScrapItem, ScrapItemStatus } from '../../../hooks/useAssetScrap';

interface AssetScrapWeighedHistoryProps {
  items: ScrapItem[];
}

type FilterKey = 'ALL' | ScrapItemStatus;

const STATUS_META: Record<ScrapItemStatus, { label: string; badge: string }> = {
  AWAITING_WEIGHT: { label: 'Awaiting weight', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
  IN_STOCK: { label: 'In stock', badge: 'bg-sky-100 text-sky-900 border-sky-300' },
  SOLD: { label: 'Sold', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  DISPOSED: { label: 'Disposed', badge: 'bg-rose-100 text-rose-900 border-rose-300' },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'IN_STOCK', label: 'In Stock' },
  { key: 'SOLD', label: 'Sold' },
  { key: 'DISPOSED', label: 'Disposed' },
];

function formatHistoryDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusIcon({ status }: { status: ScrapItemStatus }) {
  if (status === 'IN_STOCK') return <PackageCheck size={13} className="text-sky-600" />;
  if (status === 'SOLD') return <Coins size={13} className="text-emerald-600" />;
  if (status === 'DISPOSED') return <ShieldAlert size={13} className="text-rose-600" />;
  return <Scale size={13} className="text-amber-600" />;
}

export const AssetScrapWeighedHistory: React.FC<AssetScrapWeighedHistoryProps> = ({ items }) => {
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const filtered = useMemo(
    () => (filter === 'ALL' ? items : items.filter((it) => it.status === filter)),
    [items, filter]
  );

  const counts = useMemo(() => {
    const base: Record<FilterKey, number> = { ALL: items.length, AWAITING_WEIGHT: 0, IN_STOCK: 0, SOLD: 0, DISPOSED: 0 };
    items.forEach((it) => { base[it.status] += 1; });
    return base;
  }, [items]);

  const totalKg = useMemo(
    () => items.reduce((sum, it) => sum + (it.weightKg || 0), 0),
    [items]
  );

  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h4 className="text-sm font-heading font-bold text-[#00271D] flex items-center gap-2">
          <History size={16} className="text-[#0091EA]" />
          <span>Weighed Scrap History</span>
        </h4>
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#0091EA]/15 text-[#0091EA] border border-[#0091EA]/20">
          {items.length} weighed · {totalKg.toFixed(1)} kg total
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
              filter === f.key
                ? 'bg-[#00271D] text-white border-[#00271D]'
                : 'bg-white text-[#00271D]/70 border-[#00271D]/10 hover:bg-[#F9F3F0]'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 ${filter === f.key ? 'text-white/70' : 'text-gray-400'}`}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <Inbox size={22} className="mx-auto text-gray-300" />
          <p className="text-xs text-gray-400">
            {items.length === 0 ? 'No items have been weighed yet.' : 'No items match this filter.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 text-xs">
          {filtered.map((item) => {
            const meta = STATUS_META[item.status];
            return (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[#00271D] truncate flex items-center gap-1.5">
                    <StatusIcon status={item.status} />
                    <span className="truncate">{item.description || item.materialName}</span>
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {item.materialName}
                    {item.weighedAt ? ` · weighed ${formatHistoryDate(item.weighedAt)}` : ''}
                    {item.weighedBy ? ` · by ${item.weighedBy}` : ''}
                    {item.disposalReference ? ` · Ref: ${item.disposalReference}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-black text-[#00271D] text-sm">{(item.weightKg || 0).toFixed(1)} kg</span>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${meta.badge}`}>
                    {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
