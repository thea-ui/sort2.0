import React from 'react';
import { Package } from 'lucide-react';
import { Report, User as UserType, ReportStatus } from '../../../types';
import { EmptyState } from '../../../components/common/EmptyState';
import { AdminReportDetailModal } from './AdminReportDetailModal';
import { useReportQueue } from './reports/useReportQueue';
import { ReportsHeader } from './reports/ReportsHeader';
import { ReportsFilterBar } from './reports/ReportsFilterBar';
import { ReportsBulkActionBar } from './reports/ReportsBulkActionBar';
import { ReportLocationGroupCard } from './reports/ReportLocationGroupCard';
import { DispatchMrfModal } from './reports/DispatchMrfModal';
import { DismissReportModal } from './reports/DismissReportModal';

interface AdminReportsTabProps {
  reports: Report[];
  users: UserType[];
  settings?: { dismissPointPenalty?: number; falseReportPointPenalty?: number } | null;
  verifyReport: (reportId: string) => void;
  verifyReportsBatch?: (reportIds: string[]) => Promise<void>;
  dispatchReport: (reportId: string, mrfId: string, mrfName: string) => void;
  updateReportStatus: (
    reportId: string,
    status: ReportStatus,
    weightCollected?: number,
    completionNotes?: string,
    collectedOutcome?: string,
  ) => void;
  addOffense: (
    userId: string,
    description: string,
    severity?: 'WARNING' | 'DEDUCT' | 'SUSPENSION',
    reportId?: string,
  ) => void;
  deductPoints: (userId: string, amount: number, reason?: string) => void;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = (props) => {
  const { users, settings } = props;
  const queue = useReportQueue(props);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      <ReportsHeader shownCount={queue.filteredReports.length} />

      <ReportsFilterBar
        activeFilter={queue.activeFilter}
        onFilterChange={queue.setActiveFilter}
        searchQuery={queue.searchQuery}
        onSearchChange={queue.setSearchQuery}
        statusFilter={queue.statusFilter}
        onStatusChange={queue.setStatusFilter}
      />

      <ReportsBulkActionBar
        totalCount={queue.filteredReports.length}
        selectedCount={queue.selectedReportIds.length}
        selectedUnverifiedCount={queue.selectedUnverifiedCount}
        allSelected={
          queue.selectedReportIds.length === queue.filteredReports.length &&
          queue.filteredReports.length > 0
        }
        onToggleSelectAll={queue.toggleSelectAll}
        onVerifySelected={queue.handleVerifySelected}
        onClearSelection={queue.clearSelection}
      />

      <div className="space-y-4">
        {queue.locationGroups.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl">
            <EmptyState
              icon={<Package size={22} />}
              title="No reports match your filters."
              hint="Try selecting a different status filter or clear your search."
            />
          </div>
        ) : (
          queue.locationGroups.map((group) => (
            <ReportLocationGroupCard
              key={group.id}
              group={group}
              expanded={queue.expandedGroups[group.id] !== false}
              selectedReportIds={queue.selectedReportIds}
              onToggleGroup={queue.toggleGroup}
              onToggleSelect={queue.toggleSelectReport}
              onInspect={queue.setEyeModalReport}
              onVerifyGroup={queue.handleVerifyGroup}
              onDispatch={queue.openDispatchModal}
            />
          ))
        )}
      </div>

      {queue.eyeModalReport && (
        <AdminReportDetailModal
          report={queue.eyeModalReport}
          onClose={() => queue.setEyeModalReport(null)}
          onVerify={(rep) => {
            queue.handleVerify(rep);
            queue.setEyeModalReport(null);
          }}
          onReject={queue.handleRejectReport}
          onDispatch={(rep) => {
            queue.setEyeModalReport(null);
            queue.openDispatchModal(rep);
          }}
        />
      )}

      {queue.dispatchModalReport && (
        <DispatchMrfModal
          report={queue.dispatchModalReport}
          users={users}
          selectedMrfId={queue.selectedMrfId}
          onSelectMrf={queue.setSelectedMrfId}
          onConfirm={queue.handleDispatchSubmit}
          onClose={queue.closeDispatchModal}
        />
      )}

      {queue.rejectConfirmReport && (
        <DismissReportModal
          report={queue.rejectConfirmReport}
          users={users}
          settings={settings}
          justification={queue.rejectJustification}
          onJustificationChange={queue.setRejectJustification}
          onConfirm={queue.confirmRejectReport}
          onClose={queue.closeRejectModal}
        />
      )}
    </div>
  );
};
