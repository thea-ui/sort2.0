import React from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, MapPin, Send } from 'lucide-react';
import { Report } from '../../../../types';
import { cleanLocationName, isTerminalReport } from '../../../../utils/reportUtils';
import {
  getCategoryLabel,
  getCategoryStyle,
  ReportLocationGroup,
} from '../../../../utils/reportQueueUtils';
import { ReportQueueRow } from './ReportQueueRow';

interface ReportLocationGroupCardProps {
  group: ReportLocationGroup;
  expanded: boolean;
  selectedReportIds: string[];
  onToggleGroup: (groupId: string) => void;
  onToggleSelect: (reportId: string) => void;
  onInspect: (report: Report) => void;
  onVerifyGroup: (reports: Report[]) => void;
  onDispatch: (report: Report) => void;
}

export const ReportLocationGroupCard: React.FC<ReportLocationGroupCardProps> = ({
  group,
  expanded,
  selectedReportIds,
  onToggleGroup,
  onToggleSelect,
  onInspect,
  onVerifyGroup,
  onDispatch,
}) => {
  const unverifiedInGroup = group.reports.filter(
    (r) => !r.isVerified && r.status !== 'DISMISSED',
  );
  const pendingInGroup = group.reports.filter((r) => r.status === 'PENDING');
  const dispatchedInGroup = group.reports.some((r) => r.status === 'DISPATCHED');
  const canDispatch = pendingInGroup.length > 0;
  const assignedMrfName = group.reports.find((r) => r.assignedMrfName)?.assignedMrfName;
  const isFull = group.activeCount >= 3;

  const activeReports = group.reports.filter((r) => !isTerminalReport(r));
  const completedReports = group.reports.filter((r) => isTerminalReport(r));
  const hasBoth = activeReports.length > 0 && completedReports.length > 0;

  return (
    <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-2xl p-4 shadow-sm space-y-3 transition-all hover:border-[var(--accent)]/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center shadow-md shadow-[var(--accent)]/20 shrink-0">
            <MapPin size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-strong)]">
              {cleanLocationName(group.locationName)}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${getCategoryStyle(
                  group.category,
                )}`}
              >
                {getCategoryLabel(group.category)}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/50">
                {group.activeCount}/{group.reports.length} Reports — {isFull ? 'FULL' : 'AVAILABLE'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unverifiedInGroup.length > 0 && (
            <button
              type="button"
              onClick={() => onVerifyGroup(group.reports)}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-bold shadow-md shadow-[var(--accent)]/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Verify all unverified reports in this location and award points by submission order"
            >
              <CheckCircle2 size={13} /> Verify All ({unverifiedInGroup.length})
            </button>
          )}

          {canDispatch ? (
            <button
              type="button"
              onClick={() => onDispatch(pendingInGroup[0])}
              disabled={unverifiedInGroup.length > 0}
              title={unverifiedInGroup.length > 0 ? 'Verify all reports first' : 'Dispatch MRF collector'}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ${
                unverifiedInGroup.length > 0
                  ? 'bg-[var(--primary)]/10 text-[var(--text-strong)]/30 cursor-not-allowed shadow-none'
                  : 'bg-[var(--primary)] hover:bg-[var(--primary)] text-white shadow-[var(--primary)]/20 cursor-pointer'
              }`}
            >
              <Send size={13} /> Dispatch Collector
            </button>
          ) : dispatchedInGroup ? (
            <span className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-900 border border-emerald-300 text-xs font-black shadow-xs flex items-center gap-1.5 opacity-90">
              <CheckCircle2 size={13} className="text-[var(--accent)]" />
              Dispatched {assignedMrfName ? `(${assignedMrfName})` : ''}
            </span>
          ) : (
            <span className="px-4 py-2 rounded-xl bg-[var(--primary)]/5 text-[var(--text-strong)]/50 border border-[var(--primary)]/10 text-xs font-black flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Completed / Archived
            </span>
          )}

          <button
            type="button"
            onClick={() => onToggleGroup(group.id)}
            aria-label={expanded ? 'Collapse bin stream' : 'Expand bin stream'}
            className="p-2 rounded-xl bg-white border border-[var(--primary)]/10 text-[var(--text-strong)]/50 hover:text-[var(--text-strong)] transition-colors cursor-pointer"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="pt-2 space-y-2">
          {activeReports.length > 0 && (
            <div className="space-y-2">
              {activeReports.map((rep) => (
                <ReportQueueRow
                  key={rep.id}
                  report={rep}
                  variant="active"
                  selected={selectedReportIds.includes(rep.id)}
                  onToggleSelect={onToggleSelect}
                  onInspect={onInspect}
                />
              ))}
            </div>
          )}

          {hasBoth && (
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 border-t border-dashed border-[var(--primary)]/15" />
              <span className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider whitespace-nowrap">
                Previous Reports
              </span>
              <div className="flex-1 border-t border-dashed border-[var(--primary)]/15" />
            </div>
          )}

          {completedReports.length > 0 && (
            <div className="space-y-2 opacity-70">
              {completedReports.map((rep) => (
                <ReportQueueRow
                  key={rep.id}
                  report={rep}
                  variant="completed"
                  selected={selectedReportIds.includes(rep.id)}
                  onToggleSelect={onToggleSelect}
                  onInspect={onInspect}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
