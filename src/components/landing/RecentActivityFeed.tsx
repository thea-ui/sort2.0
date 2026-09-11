import React from 'react';
import { useMockData } from '../../hooks/useMockData';
import { AlertTriangle, CheckCircle, Clock, MapPin } from 'lucide-react';

import { isReportDoneAndExpired } from '../../utils/reportUtils';

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<any>; bg: string; text: string; border: string; badge: string; label: string }> = {
  PENDING:    { icon: Clock,        bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100',   badge: 'bg-amber-50 text-amber-700',   label: 'Pending' },
  DISPATCHED: { icon: MapPin,       bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-100',  badge: 'bg-violet-50 text-violet-700',  label: 'Dispatched' },
  COLLECTED:  { icon: CheckCircle,  bg: 'bg-sky-50',     text: 'text-sky-600',     border: 'border-sky-100',     badge: 'bg-sky-50 text-sky-700',        label: 'Collected' },
  RESOLVED:   { icon: CheckCircle,  bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', badge: 'bg-emerald-50 text-emerald-700', label: 'Resolved' },
  DISMISSED:  { icon: AlertTriangle, bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-100',    badge: 'bg-gray-50 text-gray-700',      label: 'Dismissed' },
  EXPIRED:    { icon: Clock,        bg: 'bg-rose-50',    text: 'text-rose-500',    border: 'border-rose-100',    badge: 'bg-rose-50 text-rose-600',     label: 'Expired' },
};

const URGENCY_CONFIG = {
  LOW:    'bg-gray-100 text-gray-500',
  MEDIUM: 'bg-amber-50 text-amber-700',
  HIGH:   'bg-red-50 text-red-600',
};

export const RecentActivityFeed: React.FC = () => {
  const { reports } = useMockData();
  const recent = [...reports].filter(r => !isReportDoneAndExpired(r)).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 4);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50 px-5 py-4">
        <AlertTriangle size={14} className="text-amber-500" strokeWidth={2} />
        <h3 className="text-xs font-bold text-gray-800">Recent Incident Reports</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {recent.map((r) => {
          const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING;
          const StatusIcon = sc.icon;
          return (
            <div key={r.id} className="flex items-start gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${sc.bg} ${sc.border}`}>
                <StatusIcon size={13} className={sc.text} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-[12px] font-semibold text-gray-800">{r.title}</p>
                  <span className={`rounded-full px-1.5 py-px text-[8px] font-bold uppercase tracking-wider ${URGENCY_CONFIG[r.urgency]}`}>
                    {r.urgency}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-gray-400">{r.locationName}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${sc.badge}`}>
                  {sc.label}
                </span>
                <p className="mt-1 text-[9px] text-gray-400">{r.reporterName}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
