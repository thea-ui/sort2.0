import React from 'react';
import { CheckCircle2, Eye } from 'lucide-react';
import { Report } from '../../../../types';
import { cleanReportTitle } from '../../../../utils/reportUtils';
import { isAssetReport } from '../../../../utils/reportQueueUtils';
import { ReportStatusBadge } from '../../../../components/common/ReportStatusBadge';

interface ReportQueueRowProps {
  report: Report;
  variant: 'active' | 'completed';
  selected: boolean;
  onToggleSelect: (reportId: string) => void;
  onInspect: (report: Report) => void;
}

export const ReportQueueRow: React.FC<ReportQueueRowProps> = ({
  report,
  variant,
  selected,
  onToggleSelect,
  onInspect,
}) => {
  const asset = isAssetReport(report);
  const badgeType = asset ? 'ASSET' : 'WASTE';
  const badgeBg = asset
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-rose-50 text-rose-700 border-rose-200';

  const isActive = variant === 'active';

  return (
    <div
      className={`rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isActive
          ? 'bg-white border border-[var(--primary)]/10 shadow-xs hover:border-[var(--accent)]/40 transition-colors'
          : 'bg-[color-mix(in_srgb,var(--primary)_5%,white)] border border-[var(--primary)]/5'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(report.id)}
          aria-label={`Select report ${cleanReportTitle(report.title)}`}
          className="rounded text-[var(--accent)] focus:ring-[var(--accent)] shrink-0 cursor-pointer"
        />
        <span
          className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badgeBg} shrink-0`}
        >
          {badgeType}
        </span>
        <div className="min-w-0">
          <p
            className={`text-xs font-bold truncate ${
              isActive ? 'text-[var(--text-strong)]' : 'text-[var(--text-strong)]/50'
            }`}
          >
            {cleanReportTitle(report.title)}
          </p>
          <p
            className={`text-[11px] font-medium mt-0.5 flex items-center gap-1 truncate ${
              isActive ? 'text-[var(--text-strong)]/60' : 'text-[var(--text-strong)]/35'
            }`}
          >
            <span>{report.reporterName}</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                isActive
                  ? 'text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,white)]'
                  : 'text-[var(--text-strong)]/40 bg-[color-mix(in_srgb,var(--primary)_10%,white)]'
              }`}
            >
              {report.reporterRole || 'student'}
            </span>
            <span>· {report.timestamp}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
        {isActive ? (
          !report.isVerified && report.status === 'PENDING' ? (
            <span className="px-3 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
              Unverified
            </span>
          ) : report.isVerified && report.status === 'PENDING' ? (
            <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={11} /> Verified
            </span>
          ) : (
            <span className="px-3 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)] border border-[var(--primary)]/25 text-[10px] font-black uppercase tracking-wider">
              Dispatched ({report.assignedMrfName || 'MRF'})
            </span>
          )
        ) : (
          <ReportStatusBadge status={report.status} />
        )}

        <button
          type="button"
          onClick={() => onInspect(report)}
          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
            isActive
              ? 'bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)] hover:bg-[color-mix(in_srgb,var(--primary)_15%,white)] border-[var(--primary)]/25'
              : 'bg-[color-mix(in_srgb,var(--primary)_5%,white)] text-[var(--text-strong)]/40 hover:bg-[color-mix(in_srgb,var(--primary)_10%,white)] border-[var(--primary)]/10'
          }`}
          title={isActive ? 'Inspect details & verify' : 'Inspect details'}
        >
          <Eye size={16} />
        </button>
      </div>
    </div>
  );
};
