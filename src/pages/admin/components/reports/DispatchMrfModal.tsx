import React from 'react';
import { Navigation, Send } from 'lucide-react';
import { Report, User as UserType } from '../../../../types';
import { cleanLocationName } from '../../../../utils/reportUtils';
import { AppModal } from '../../../../components/common/AppModal';

interface DispatchMrfModalProps {
  report: Report;
  users: UserType[];
  selectedMrfId: string;
  onSelectMrf: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const DispatchMrfModal: React.FC<DispatchMrfModalProps> = ({
  report,
  users,
  selectedMrfId,
  onSelectMrf,
  onConfirm,
  onClose,
}) => {
  const mrfUsers = users.filter((u) => u.role === 'MRF');
  const showGrid =
    (report.isScatteredDebris || report.locationName.toLowerCase().includes('scattered')) &&
    report.coordinates;

  return (
    <AppModal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      icon={<Send size={18} />}
      title="Dispatch MRF Collector"
      description="Assign a collector to handle this site request"
      size="sm"
      confirmLabel="Confirm Dispatch Assignment"
      confirmDisabled={!selectedMrfId}
      onConfirm={onConfirm}
    >
      <div className="space-y-4 text-xs">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider">
            Target Incident Location
          </label>
          <input
            type="text"
            readOnly
            value={cleanLocationName(report.locationName)}
            className="w-full rounded-xl border border-[var(--primary)]/10 bg-[color-mix(in_srgb,var(--primary)_5%,white)] px-3.5 py-2.5 text-xs text-[var(--text-strong)] font-bold outline-none"
          />
          {showGrid && report.coordinates && (
            <p className="text-[10px] text-[var(--text-strong)]/50 font-mono mt-1 flex items-center gap-1">
              <Navigation size={10} className="text-[var(--accent)]" /> Grid [
              {report.coordinates.lat.toFixed(4)}, {report.coordinates.lng.toFixed(4)}]
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="dispatch-mrf-select"
            className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider"
          >
            Select MRF Staff Member
          </label>
          <select
            id="dispatch-mrf-select"
            value={selectedMrfId}
            onChange={(e) => onSelectMrf(e.target.value)}
            required
            className="w-full rounded-xl border border-[var(--primary)]/10 bg-[color-mix(in_srgb,var(--primary)_5%,white)] px-3.5 py-2.5 text-xs text-[var(--text-strong)] font-semibold outline-none focus:border-[var(--accent)] focus:bg-white cursor-pointer"
          >
            <option value="">-- Pick MRF Personnel --</option>
            {mrfUsers.map((mrf) => (
              <option key={mrf.id} value={mrf.id}>
                {mrf.name} ({mrf.employeeId})
              </option>
            ))}
            {mrfUsers.length === 0 && (
              <option value="mrf-default">MRF Dispatch Operations Team</option>
            )}
          </select>
        </div>
      </div>
    </AppModal>
  );
};
