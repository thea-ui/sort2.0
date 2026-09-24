import { useState } from 'react';
import { Report, User as UserType, ReportStatus } from '../../../../types';
import { toast } from '../../../../hooks/useToast';
import {
  computeOffenseSeverity,
  filterQueueReports,
  groupReportsByLocation,
  ReportQueueScope,
} from '../../../../utils/reportQueueUtils';

const DEFAULT_JUSTIFICATION = 'False report submission / Non-existent waste hazard';

export interface UseReportQueueArgs {
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

export function useReportQueue({
  reports,
  users,
  settings,
  verifyReport,
  verifyReportsBatch,
  dispatchReport,
  updateReportStatus,
  addOffense,
  deductPoints,
}: UseReportQueueArgs) {
  const [activeFilter, setActiveFilter] = useState<ReportQueueScope>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'group-0': true,
    'group-1': true,
    'group-2': true,
  });
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);

  const [eyeModalReport, setEyeModalReport] = useState<Report | null>(null);
  const [dispatchModalReport, setDispatchModalReport] = useState<Report | null>(null);
  const [selectedMrfId, setSelectedMrfId] = useState<string>('');
  const [rejectConfirmReport, setRejectConfirmReport] = useState<Report | null>(null);
  const [rejectJustification, setRejectJustification] = useState(DEFAULT_JUSTIFICATION);

  const filteredReports = filterQueueReports(reports, {
    activeFilter,
    searchQuery,
    statusFilter,
  });
  const locationGroups = groupReportsByLocation(filteredReports);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleSelectReport = (reportId: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedReportIds.length === filteredReports.length && filteredReports.length > 0) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(filteredReports.map((r) => r.id));
    }
  };

  const clearSelection = () => setSelectedReportIds([]);

  const runBatchVerify = async (targetReports: Report[], successMessage: string) => {
    const targetIds = targetReports.map((r) => r.id);
    if (verifyReportsBatch) {
      try {
        await verifyReportsBatch(targetIds);
        toast.success(`${successMessage} Points distributed by server.`);
      } catch (err) {
        toast.error('Verification failed. Please try again.');
        console.warn('Batch verify error:', err);
      }
    } else {
      targetReports.forEach((rep) => verifyReport(rep.id));
      toast.success(successMessage);
    }
  };

  const handleVerifyGroup = async (groupReports: Report[]) => {
    const unverified = groupReports.filter((r) => !r.isVerified);
    if (unverified.length === 0) {
      toast.info('All reports in this bin stream are already verified.');
      return;
    }
    const locName = groupReports[0]?.locationName || 'Location';
    const catName = groupReports[0]?.category || 'GENERAL';
    await runBatchVerify(
      unverified,
      `Verified ${unverified.length} report(s) for ${catName} at "${locName}".`,
    );
  };

  const handleVerifySelected = async () => {
    const targetReports = reports.filter(
      (r) => selectedReportIds.includes(r.id) && !r.isVerified,
    );
    if (targetReports.length === 0) {
      toast.info('No unverified reports are currently selected.');
      return;
    }
    await runBatchVerify(targetReports, `Verified ${targetReports.length} selected report(s).`);
  };

  const handleVerify = (report: Report) => {
    verifyReport(report.id);
    toast.success(
      `Report at "${report.locationName}" (${report.category}) verified. Points awarded to ${report.reporterName} based on rank.`,
    );
  };

  const openDispatchModal = (report: Report) => {
    setSelectedMrfId('');
    setDispatchModalReport(report);
  };

  const closeDispatchModal = () => {
    setDispatchModalReport(null);
    setSelectedMrfId('');
  };

  const handleDispatchSubmit = () => {
    if (!dispatchModalReport || !selectedMrfId) return;
    const mrfUser = users.find((u) => u.id === selectedMrfId);
    const mrfName = mrfUser ? mrfUser.name : 'MRF Dispatch Staff';
    dispatchReport(dispatchModalReport.id, selectedMrfId, mrfName);
    toast.success(`MRF Staff "${mrfName}" dispatched to ${dispatchModalReport.locationName}.`);
    closeDispatchModal();
  };

  const handleRejectReport = (report: Report) => {
    setRejectConfirmReport(report);
  };

  const closeRejectModal = () => {
    setRejectConfirmReport(null);
    setRejectJustification(DEFAULT_JUSTIFICATION);
  };

  const confirmRejectReport = async () => {
    if (!rejectConfirmReport) return;
    const report = rejectConfirmReport;
    const dismissPenalty = settings?.dismissPointPenalty ?? 10;

    const reporter = users.find((u) => u.id === report.reporterId);
    const autoSeverity = computeOffenseSeverity(reporter?.warningsCount ?? 0);

    if (report.reporterId) {
      await addOffense(
        report.reporterId,
        rejectJustification ||
          `False or improper report: "${report.title}" at ${report.locationName}`,
        autoSeverity,
        report.id,
      );
      if (autoSeverity === 'DEDUCT') {
        await deductPoints(report.reporterId, dismissPenalty, `Marked fake: ${report.title}`);
      }
    }
    if (updateReportStatus) {
      await updateReportStatus(
        report.id,
        'DISMISSED' as ReportStatus,
        undefined,
        'Marked as fake/dismissed by admin',
      );
    }
    const sevLabel =
      autoSeverity === 'WARNING'
        ? 'Warning'
        : autoSeverity === 'DEDUCT'
          ? `${dismissPenalty} pts deducted`
          : 'Account suspended';
    toast.success(`Report dismissed. ${sevLabel} for ${report.reporterName}.`);
    closeRejectModal();
    if (eyeModalReport?.id === report.id) setEyeModalReport(null);
  };

  const selectedUnverifiedCount = selectedReportIds.filter(
    (id) => !reports.find((r) => r.id === id)?.isVerified,
  ).length;

  return {
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    expandedGroups,
    toggleGroup,
    selectedReportIds,
    selectedUnverifiedCount,
    toggleSelectReport,
    toggleSelectAll,
    clearSelection,
    filteredReports,
    locationGroups,
    eyeModalReport,
    setEyeModalReport,
    dispatchModalReport,
    selectedMrfId,
    setSelectedMrfId,
    rejectConfirmReport,
    rejectJustification,
    setRejectJustification,
    handleVerifyGroup,
    handleVerifySelected,
    handleVerify,
    openDispatchModal,
    closeDispatchModal,
    handleDispatchSubmit,
    handleRejectReport,
    closeRejectModal,
    confirmRejectReport,
  };
}
