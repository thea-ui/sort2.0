import React from 'react';
import { AlertOctagon, AlertTriangle, Ban, Coins } from 'lucide-react';
import { Report, User as UserType } from '../../../../types';
import { computeOffenseSeverity, OffenseSeverity } from '../../../../utils/reportQueueUtils';
import { AppModal } from '../../../../components/common/AppModal';

interface DismissReportModalProps {
  report: Report;
  users: UserType[];
  settings?: { dismissPointPenalty?: number; falseReportPointPenalty?: number } | null;
  justification: string;
  onJustificationChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const SEVERITY_CONFIG: Record<
  OffenseSeverity,
  { label: string; desc: (penalty: number) => string; icon: React.ReactNode; cardClass: string }
> = {
  WARNING: {
    label: '1st Offense — Warning',
    desc: () => 'Logged to record only',
    icon: <AlertTriangle size={20} className="text-amber-500" />,
    cardClass: 'border-amber-400 bg-amber-50',
  },
  DEDUCT: {
    label: '2nd Offense — Deduct Points',
    desc: (penalty) => `${penalty} pts will be deducted`,
    icon: <Coins size={20} className="text-orange-500" />,
    cardClass: 'border-orange-400 bg-orange-50',
  },
  SUSPENSION: {
    label: '3rd+ Offense — Account Suspension',
    desc: () => '1 day account ban',
    icon: <Ban size={20} className="text-rose-500" />,
    cardClass: 'border-rose-400 bg-rose-50',
  },
};

export const DismissReportModal: React.FC<DismissReportModalProps> = ({
  report,
  users,
  settings,
  justification,
  onJustificationChange,
  onConfirm,
  onClose,
}) => {
  const penalty = settings?.dismissPointPenalty ?? 10;
  const reporter = users.find((u) => u.id === report.reporterId);
  const severity = computeOffenseSeverity(reporter?.warningsCount ?? 0);
  const config = SEVERITY_CONFIG[severity];

  const confirmLabel =
    severity === 'WARNING'
      ? 'Confirm Warning'
      : severity === 'DEDUCT'
        ? `Confirm (-${penalty} pts)`
        : 'Confirm (1 Day Suspension)';

  return (
    <AppModal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      icon={<AlertOctagon size={18} />}
      title="Report Dismissal"
      description="Offense auto-determined by reporter history"
      size="sm"
      destructive
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
    >
      <div className="space-y-5">
        <div className="bg-[var(--background)] rounded-2xl p-4 border border-[var(--primary)]/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider">
              Reporter
            </span>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[9px] font-black uppercase border border-rose-200">
              False Report
            </span>
          </div>
          <p className="text-sm font-extrabold text-[var(--text-strong)]">{report.reporterName}</p>
          <p className="text-[11px] text-[var(--text-strong)]/50 font-medium leading-relaxed line-clamp-2">
            "{report.title}" at {report.locationName}
          </p>
        </div>

        <div className="space-y-2.5">
          <label className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider block">
            Offense Level (Auto)
          </label>
          <div className={`py-3.5 px-4 rounded-2xl border-2 text-center ${config.cardClass}`}>
            <div className="flex justify-center mb-1.5">{config.icon}</div>
            <p className="text-[11px] font-extrabold text-[var(--text-strong)]">{config.label}</p>
            <p className="text-[9px] font-bold text-[var(--text-strong)]/60 mt-0.5">
              {config.desc(penalty)}
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="dismiss-justification"
            className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider block mb-1.5"
          >
            Offense Justification Note
          </label>
          <textarea
            id="dismiss-justification"
            value={justification}
            onChange={(e) => onJustificationChange(e.target.value)}
            rows={3}
            required
            className="w-full px-3 py-2 rounded-xl border border-[var(--primary)]/10 focus:border-rose-500 outline-none resize-none font-medium text-xs text-[var(--text-strong)]"
            placeholder="Enter justification for this offense..."
          />
        </div>
      </div>
    </AppModal>
  );
};
