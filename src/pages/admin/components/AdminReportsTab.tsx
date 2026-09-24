import React, { useState } from 'react';
import {
  FileText,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  MapPin,
  Send,
  X,
  Package,
  Recycle,
  Armchair,
  Clock,
  Navigation,
} from 'lucide-react';
import { Report, User as UserType, ReportStatus } from '../../../types';
import { cleanReportTitle, cleanLocationName } from '../../../utils/reportUtils';
import { AdminReportDetailModal } from './AdminReportDetailModal';
import { ModalPortal } from '../../../components/common/ModalPortal';

// Reports queue day-scope uses the school's local day (matches the 6 PM reset TZ).
const REPORT_QUEUE_TZ = 'Asia/Manila';

function isSameLocalDay(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: REPORT_QUEUE_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(d) === fmt.format(new Date());
  } catch {
    return d.toDateString() === new Date().toDateString();
  }
}

interface AdminReportsTabProps {
  reports: Report[];
  users: UserType[];
  settings?: { dismissPointPenalty?: number; falseReportPointPenalty?: number } | null;
  verifyReport: (reportId: string) => void;
  verifyReportsBatch?: (reportIds: string[]) => Promise<void>;
  dispatchReport: (reportId: string, mrfId: string, mrfName: string) => void;
  updateReportStatus: (reportId: string, status: ReportStatus, weightCollected?: number, completionNotes?: string, collectedOutcome?: string) => void;
  addOffense: (userId: string, description: string, severity?: 'WARNING' | 'DEDUCT' | 'SUSPENSION', reportId?: string) => void;
  deductPoints: (userId: string, amount: number, reason?: string) => void;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({
  reports,
  users,
  settings,
  verifyReport,
  verifyReportsBatch,
  dispatchReport,
  addOffense,
  deductPoints,
  updateReportStatus,
}) => {
  // Navigation & Filter States
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'WASTE' | 'ASSET'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals & Accordion States
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'group-0': true,
    'group-1': true,
    'group-2': true,
  });
  const [eyeModalReport, setEyeModalReport] = useState<Report | null>(null);
  const [dispatchModalReport, setDispatchModalReport] = useState<Report | null>(null);
  const [selectedMrfId, setSelectedMrfId] = useState<string>('');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);

  // Toast / Notification Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [rejectConfirmReport, setRejectConfirmReport] = useState<Report | null>(null);
  const [rejectJustification, setRejectJustification] = useState('False report submission / Non-existent waste hazard');

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const getTimeMs = (r: Report) => {
    if (r.timestamp) {
      let ts = r.timestamp.trim();
      if (ts.includes(' ')) {
        ts = ts.replace(' ', 'T');
      }
      if (!ts.endsWith('Z') && !ts.includes('+') && !ts.slice(10).includes('-')) {
        ts += 'Z';
      }
      const val = new Date(ts).getTime();
      if (!isNaN(val) && val > 0) return val;
    }
    if (r.id && r.id.startsWith('rep-')) {
      const num = parseInt(r.id.replace('rep-', ''), 10);
      if (!isNaN(num)) return num;
    }
    return 0;
  };

  const toggleSelectReport = (reportId: string) => {
    setSelectedReportIds(prev =>
      prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedReportIds.length === filteredReports.length && filteredReports.length > 0) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(filteredReports.map(r => r.id));
    }
  };

  const handleVerifyGroup = async (groupReports: Report[]) => {
    const unverified = groupReports.filter(r => !r.isVerified);
    if (unverified.length === 0) {
      showNotification("All reports in this bin stream are already verified!");
      return;
    }

    const unverifiedIds = unverified.map(r => r.id);
    const locName = groupReports[0]?.locationName || 'Location';
    const catName = groupReports[0]?.category || 'GENERAL';

    if (verifyReportsBatch) {
      try {
        await verifyReportsBatch(unverifiedIds);
        showNotification(`Verified ${unverified.length} report(s) for ${catName} at "${locName}"! Points distributed by server.`);
      } catch (err) {
        showNotification(`Verification failed. Please try again.`);
        console.warn('Batch verify error:', err);
      }
    } else {
      // Fallback: verify each report individually
      unverified.forEach(rep => verifyReport(rep.id));
      showNotification(`Verified ${unverified.length} report(s) for ${catName} at "${locName}"!`);
    }
  };

  const handleVerifySelected = async () => {
    const targetReports = reports.filter(r => selectedReportIds.includes(r.id) && !r.isVerified);
    if (targetReports.length === 0) {
      showNotification("No unverified reports are currently selected.");
      return;
    }

    const targetIds = targetReports.map(r => r.id);

    if (verifyReportsBatch) {
      try {
        await verifyReportsBatch(targetIds);
        showNotification(`Verified ${targetReports.length} selected report(s)! Points distributed by server.`);
      } catch (err) {
        showNotification(`Verification failed. Please try again.`);
        console.warn('Batch verify error:', err);
      }
    } else {
      // Fallback: verify each report individually
      targetReports.forEach(r => verifyReport(r.id));
      showNotification(`Verified ${targetReports.length} selected report(s)!`);
    }
  };

  // Filter & Sort Reports by Time (Newest First)
  const filteredReports = reports
    .filter(r => {
      // Queue scope: only today's reports + still-active older reports.
      // EXPIRED is terminal/neutral and lives in History/Collections, not the queue.
      if (r.status === 'EXPIRED') return false;
      const isActiveReport = r.status === 'PENDING' || r.status === 'DISPATCHED';
      if (!isActiveReport && !isSameLocalDay(r.timestamp)) return false;

      // Waste vs Asset filter
      const isAsset = r.reportType === 'ASSET' ||
        r.description.toUpperCase().includes('[PILLAR: FURNITURE]') ||
        r.description.toUpperCase().includes('[PILLAR: ELECTRONICS]') ||
        r.description.toUpperCase().includes('[PILLAR: FIXTURES]') ||
        r.description.toUpperCase().includes('[PILLAR: EQUIPMENT]') ||
        r.description.toUpperCase().includes('[PILLAR: OTHER]');

      if (activeFilter === 'WASTE' && isAsset) return false;
      if (activeFilter === 'ASSET' && !isAsset) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchLoc = r.locationName.toLowerCase().includes(q);
        const matchReporter = r.reporterName.toLowerCase().includes(q);
        const matchDesc = r.description.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchReporter && !matchDesc) return false;
      }

      // Status filter
      if (statusFilter === 'UNVERIFIED' && r.isVerified) return false;
      if (statusFilter === 'VERIFIED' && (!r.isVerified || r.status === 'DISPATCHED' || r.status === 'COLLECTED' || r.status === 'RESOLVED')) return false;
      if (statusFilter === 'DISPATCHED' && r.status !== 'DISPATCHED') return false;
      if (statusFilter === 'DISMISSED' && r.status !== 'DISMISSED') return false;
      if (statusFilter === 'DONE' && r.status !== 'COLLECTED' && r.status !== 'RESOLVED') return false;

      return true;
    })
    .sort((a, b) => getTimeMs(b) - getTimeMs(a)); // Newest / most recent first

  // Group Reports by Location + Category (Bin Stream Level)
  // Each unique location+category combination is a separate bin stream group
  const groupedMap: Record<string, Report[]> = {};
  filteredReports.forEach(r => {
    const locKey = `${r.locationName || 'General Campus Location'}__${r.category || 'GENERAL'}`;
    if (!groupedMap[locKey]) groupedMap[locKey] = [];
    groupedMap[locKey].push(r);
  });

  const locationGroups = Object.keys(groupedMap)
    .map((locKey, index) => {
      const [locName, cat] = locKey.split('__');
      const groupReports = groupedMap[locKey].sort((a, b) => getTimeMs(b) - getTimeMs(a));
      const latestTime = groupReports[0] ? getTimeMs(groupReports[0]) : 0;
      const activeCount = groupReports.filter(r => r.status === 'PENDING' || r.status === 'DISPATCHED').length;
      const completedCount = groupReports.filter(r => r.status === 'COLLECTED' || r.status === 'RESOLVED').length;
      return {
        id: `group-${index}`,
        locationName: locName,
        category: cat,
        reports: groupReports,
        latestTime,
        activeCount,
        completedCount,
      };
    })
    .sort((gA, gB) => gB.latestTime - gA.latestTime);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleVerify = (report: Report) => {
    verifyReport(report.id);
    showNotification(`Report at "${report.locationName}" (${report.category}) verified! Points awarded to ${report.reporterName} based on rank.`);
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalReport || !selectedMrfId) return;

    const mrfUser = users.find(u => u.id === selectedMrfId);
    const mrfName = mrfUser ? mrfUser.name : 'MRF Dispatch Staff';

    dispatchReport(dispatchModalReport.id, selectedMrfId, mrfName);
    showNotification(`MRF Staff "${mrfName}" dispatched to ${dispatchModalReport.locationName}!`);
    setDispatchModalReport(null);
    setSelectedMrfId('');
  };

  const handleRejectReport = (report: Report) => {
    setRejectConfirmReport(report);
  };

  const confirmRejectReport = async () => {
    if (!rejectConfirmReport) return;
    const report = rejectConfirmReport;
    const dismissPenalty = settings?.dismissPointPenalty ?? 10;

    // Auto-determine offense level based on reporter's existing warningsCount
    const reporter = users.find(u => u.id === report.reporterId);
    const level = (reporter?.warningsCount ?? 0) + 1;
    const autoSeverity: 'WARNING' | 'DEDUCT' | 'SUSPENSION' =
      level === 1 ? 'WARNING' : level === 2 ? 'DEDUCT' : 'SUSPENSION';

    if (report.reporterId) {
      await addOffense(
        report.reporterId,
        rejectJustification || `False or improper report: "${report.title}" at ${report.locationName}`,
        autoSeverity,
        report.id
      );
      if (autoSeverity === 'DEDUCT') {
        await deductPoints(report.reporterId, dismissPenalty, `Marked fake: ${report.title}`);
      }
    }
    if (updateReportStatus) {
      await updateReportStatus(report.id, 'DISMISSED' as any, undefined, 'Marked as fake/dismissed by admin');
    }
    const sevLabel = autoSeverity === 'WARNING' ? 'Warning' : autoSeverity === 'DEDUCT' ? `${dismissPenalty} pts deducted` : 'Account suspended';
    showNotification(`Report dismissed. ${sevLabel} for ${report.reporterName}.`);
    setRejectConfirmReport(null);
    setRejectJustification('False report submission / Non-existent waste hazard');
    if (eyeModalReport?.id === report.id) setEyeModalReport(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">

      {/* Toast Notification Banner */}
      {feedbackMsg && (
        <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 z-[9999] bg-[var(--primary)] text-white px-5 py-4 rounded-2xl shadow-2xl border-2 border-[var(--accent)] flex items-center gap-3 animate-fade-in max-w-sm sm:ml-auto">
          <div className="h-8 w-8 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-[var(--accent)]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)]">Dispatched Successfully</span>
            <span className="text-xs font-bold text-white mt-0.5">{feedbackMsg}</span>
          </div>
        </div>
      )}

      {/* Header Banner (Matches Screenshot 714 Header Spec) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--primary)]/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-[var(--accent)] bg-[var(--accent)]/15 border border-[var(--accent)]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Management Portal
            </span>
          </div>
          <h2 className="text-2xl font-heading font-black text-[var(--text-strong)] tracking-tight mt-1">All Reports</h2>
          <p className="text-xs text-[var(--text-strong)]/60 font-medium">
            Today's action queue · {filteredReports.length} shown · expired &amp; older reports are in <strong className="text-[var(--text-strong)]">Collections</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => showNotification("Refreshed reports feed")}
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-[var(--text-strong)] flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => showNotification("Audit logs ready")}
            className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 size={14} /> Clear All
          </button>
        </div>
      </div>

      {/* Category Pills (All Reports / Waste / Assets) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
            activeFilter === 'ALL'
              ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20'
              : 'bg-white border border-gray-200 text-[var(--text-strong)]/70 hover:bg-gray-50'
          }`}
        >
          <FileText size={15} /> All Reports
        </button>

        <button
          onClick={() => setActiveFilter('WASTE')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
            activeFilter === 'WASTE'
              ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20'
              : 'bg-white border border-gray-200 text-[var(--text-strong)]/70 hover:bg-gray-50'
          }`}
        >
          <Recycle size={15} /> Waste
        </button>

        <button
          onClick={() => setActiveFilter('ASSET')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
            activeFilter === 'ASSET'
              ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20'
              : 'bg-white border border-gray-200 text-[var(--text-strong)]/70 hover:bg-gray-50'
          }`}
        >
          <Armchair size={15} /> Assets
        </button>
      </div>

      {/* Search & Status Filter Controls (Matches Screenshot 714) */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[var(--accent)] focus:bg-white transition-all text-[var(--text-strong)]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[var(--accent)] font-semibold text-[var(--text-strong)] cursor-pointer"
        >
          <option value="ALL">All Status</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="VERIFIED">Verified</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="DONE">Done / Completed</option>
        </select>
      </div>

      {/* Select All Sub-bar & Bulk Action Controls */}
      <div className="bg-white/90 border border-[var(--primary)]/10 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-semibold text-[var(--text-strong)]">
          <input
            type="checkbox"
            id="selectAll"
            checked={selectedReportIds.length === filteredReports.length && filteredReports.length > 0}
            onChange={toggleSelectAll}
            className="rounded text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
          />
          <label htmlFor="selectAll" className="cursor-pointer font-bold">
            Select All ({filteredReports.length})
          </label>
          {selectedReportIds.length > 0 && (
            <span className="text-[11px] font-bold text-[var(--accent)] bg-[var(--accent)]/15 px-2.5 py-0.5 rounded-full ml-1 border border-[var(--accent)]/30">
              {selectedReportIds.length} Selected
            </span>
          )}
        </div>

        {selectedReportIds.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleVerifySelected}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-bold shadow-md shadow-[var(--accent)]/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={14} /> Verify Selected ({selectedReportIds.filter(id => !reports.find(r => r.id === id)?.isVerified).length})
            </button>
            <button
              onClick={() => setSelectedReportIds([])}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-600 transition-colors cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        )}
      </div>

      {/* Grouped Location Containers (Matches Screenshot 714 Card Layout) */}
      <div className="space-y-4">
        {locationGroups.length === 0 ? (
          <div className="bg-white/80 border border-gray-200 rounded-3xl p-12 text-center text-gray-400 space-y-2">
            <Package size={32} className="mx-auto text-gray-300" />
            <p className="text-sm font-bold text-[var(--text-strong)]">No reports match your filters.</p>
            <p className="text-xs">Try selecting a different status filter or clear your search.</p>
          </div>
        ) : (
          locationGroups.map(group => {
            const isExpanded = expandedGroups[group.id] !== false; // default open
            const unverifiedInGroup = group.reports.filter(r => !r.isVerified && r.status !== 'DISMISSED');
            const pendingInGroup = group.reports.filter(r => r.status === 'PENDING');
            const dispatchedInGroup = group.reports.some(r => r.status === 'DISPATCHED');
            const canDispatch = pendingInGroup.length > 0;
            const assignedMrfName = group.reports.find(r => r.assignedMrfName)?.assignedMrfName;

            // Category styling for bin stream header
            const catLabel = group.category === 'RECYCLABLE' ? 'Recyclable'
              : group.category === 'BIODEGRADABLE' ? 'Biodegradable'
              : group.category === 'HAZARDOUS' ? 'Hazardous'
              : 'Non-Biodegradable';
            const catStyle = group.category === 'RECYCLABLE' ? 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25'
              : group.category === 'BIODEGRADABLE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : group.category === 'HAZARDOUS' ? 'bg-rose-100 text-rose-700 border-rose-200'
              : 'bg-amber-100 text-amber-700 border-amber-200';

            const isFull = group.activeCount >= 3;

            return (
              <div
                key={group.id}
                className="bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-2xl p-4 shadow-sm space-y-3 transition-all hover:border-[var(--accent)]/30"
              >
                {/* Group Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center shadow-md shadow-[var(--accent)]/20 shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-heading font-black text-[var(--text-strong)]">
                        {cleanLocationName(group.locationName)}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${catStyle}`}>
                          {catLabel}
                        </span>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/50">
                          {group.activeCount}/{group.reports.length} Reports — {isFull ? 'FULL' : 'AVAILABLE'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Render "Verify All" button FIRST before "Dispatch Collector" if unverified reports exist */}
                    {unverifiedInGroup.length > 0 && (
                      <button
                        onClick={() => handleVerifyGroup(group.reports)}
                        className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-bold shadow-md shadow-[var(--accent)]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Verify all unverified reports in this location and award points by submission order"
                      >
                        <CheckCircle2 size={13} /> Verify All ({unverifiedInGroup.length})
                      </button>
                    )}

                    {canDispatch ? (
                      <button
                        onClick={() => setDispatchModalReport(pendingInGroup[0])}
                        disabled={unverifiedInGroup.length > 0}
                        title={unverifiedInGroup.length > 0 ? 'Verify all reports first' : 'Dispatch MRF collector'}
                        className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ${
                          unverifiedInGroup.length > 0
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                            : 'bg-[var(--primary)] hover:bg-[var(--primary)] text-white shadow-[var(--primary)]/20 cursor-pointer'
                        }`}
                      >
                        <Send size={13} /> Dispatch Collector
                      </button>
                    ) : dispatchedInGroup ? (
                      <button
                        disabled
                        className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-900 border border-emerald-300 text-xs font-black shadow-xs flex items-center gap-1.5 cursor-not-allowed opacity-90"
                      >
                        <CheckCircle2 size={13} className="text-[var(--accent)]" />
                        Dispatched {assignedMrfName ? `(${assignedMrfName})` : ''}
                      </button>
                    ) : (
                      <span className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 border border-gray-200 text-xs font-black flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> Completed / Archived
                      </span>
                    )}

                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-[var(--text-strong)] transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Group Nested Reports List */}
                {isExpanded && (() => {
                  const activeReports = group.reports.filter(r => r.status !== 'COLLECTED' && r.status !== 'RESOLVED' && r.status !== 'DISMISSED' && r.status !== 'EXPIRED');
                  const completedReports = group.reports.filter(r => r.status === 'COLLECTED' || r.status === 'RESOLVED' || r.status === 'DISMISSED' || r.status === 'EXPIRED');
                  const hasBoth = activeReports.length > 0 && completedReports.length > 0;

                  return (
                    <div className="pt-2 space-y-2">
                      {/* Active / New Reports */}
                      {activeReports.length > 0 && (
                        <div className="divide-y divide-gray-200/60 space-y-2">
                          {activeReports.map(rep => {
                            const repIsAsset = rep.reportType === 'ASSET' ||
                              rep.description.toUpperCase().includes('[PILLAR: FURNITURE]') ||
                              rep.description.toUpperCase().includes('[PILLAR: ELECTRONICS]') ||
                              rep.description.toUpperCase().includes('[PILLAR: FIXTURES]') ||
                              rep.description.toUpperCase().includes('[PILLAR: EQUIPMENT]') ||
                              rep.description.toUpperCase().includes('[PILLAR: OTHER]');

                            const badgeType = repIsAsset ? 'ASSET' : 'WASTE';
                            const badgeBg = repIsAsset ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';

                            return (
                              <div
                                key={rep.id}
                                className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[var(--accent)]/40 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={selectedReportIds.includes(rep.id)}
                                    onChange={() => toggleSelectReport(rep.id)}
                                    className="rounded text-[var(--accent)] focus:ring-[var(--accent)] shrink-0 cursor-pointer"
                                  />
                                  <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badgeBg} shrink-0`}>
                                    {badgeType}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-[var(--text-strong)] truncate">{cleanReportTitle(rep.title)}</p>
                                    <p className="text-[11px] text-[var(--text-strong)]/60 font-medium mt-0.5 flex items-center gap-1 truncate">
                                      <span>{rep.reporterName}</span>
                                      <span className="text-[9px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.2 rounded-full uppercase">
                                        {rep.reporterRole || 'student'}
                                      </span>
                                      <span>· {rep.timestamp}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                  {!rep.isVerified && rep.status === 'PENDING' ? (
                                    <span className="px-3 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                                      Unverified
                                    </span>
                                  ) : rep.isVerified && rep.status === 'PENDING' ? (
                                    <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                      <CheckCircle2 size={11} /> Verified
                                    </span>
                                  ) : (
                                    <span className="px-3 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--text-strong)] border border-[var(--primary)]/25 text-[10px] font-black uppercase tracking-wider">
                                      Dispatched ({rep.assignedMrfName || 'MRF'})
                                    </span>
                                  )}

                                  <button
                                    onClick={() => setEyeModalReport(rep)}
                                    className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--text-strong)] hover:bg-[var(--primary)]/10 border border-[var(--primary)]/25 transition-colors cursor-pointer"
                                    title="Inspect details & verify"
                                  >
                                    <Eye size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Divider between active and completed reports */}
                      {hasBoth && (
                        <div className="flex items-center gap-3 py-1">
                          <div className="flex-1 border-t border-dashed border-[var(--primary)]/15" />
                          <span className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider whitespace-nowrap">Previous Reports</span>
                          <div className="flex-1 border-t border-dashed border-[var(--primary)]/15" />
                        </div>
                      )}

                      {/* Completed / Dismissed Reports (Muted) */}
                      {completedReports.length > 0 && (
                        <div className="divide-y divide-gray-200/60 space-y-2 opacity-60">
                          {completedReports.map(rep => {
                            const repIsAsset = rep.reportType === 'ASSET' ||
                              rep.description.toUpperCase().includes('[PILLAR: FURNITURE]') ||
                              rep.description.toUpperCase().includes('[PILLAR: ELECTRONICS]') ||
                              rep.description.toUpperCase().includes('[PILLAR: FIXTURES]') ||
                              rep.description.toUpperCase().includes('[PILLAR: EQUIPMENT]') ||
                              rep.description.toUpperCase().includes('[PILLAR: OTHER]');

                            const badgeType = repIsAsset ? 'ASSET' : 'WASTE';
                            const badgeBg = repIsAsset ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';

                            return (
                              <div
                                key={rep.id}
                                className="bg-gray-50/80 border border-gray-200/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={selectedReportIds.includes(rep.id)}
                                    onChange={() => toggleSelectReport(rep.id)}
                                    className="rounded text-[var(--accent)] focus:ring-[var(--accent)] shrink-0 cursor-pointer"
                                  />
                                  <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badgeBg} shrink-0`}>
                                    {badgeType}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-500 truncate">{cleanReportTitle(rep.title)}</p>
                                    <p className="text-[11px] text-gray-400 font-medium mt-0.5 flex items-center gap-1 truncate">
                                      <span>{rep.reporterName}</span>
                                      <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded-full uppercase">
                                        {rep.reporterRole || 'student'}
                                      </span>
                                      <span>· {rep.timestamp}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                  {rep.status === 'DISMISSED' ? (
                                    <span className="px-3 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                      <AlertOctagon size={11} /> Dismissed
                                    </span>
                                  ) : rep.status === 'EXPIRED' ? (
                                    <span className="px-3 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                      <Clock size={11} /> Expired (6 PM)
                                    </span>
                                  ) : (
                                    <span className="px-3 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--text-strong)] border border-[var(--primary)]/25 text-[10px] font-black uppercase tracking-wider">
                                      Done / Completed
                                    </span>
                                  )}

                                  <button
                                    onClick={() => setEyeModalReport(rep)}
                                    className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
                                    title="Inspect details"
                                  >
                                    <Eye size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>

      {/* ── EYE MODAL (Report Inspection & Campus Mini-Map Preview) ── */}
      {eyeModalReport && (
        <AdminReportDetailModal
          report={eyeModalReport}
          onClose={() => setEyeModalReport(null)}
          onVerify={(rep) => { handleVerify(rep); setEyeModalReport(null); }}
          onReject={handleRejectReport}
          onDispatch={(rep) => { setEyeModalReport(null); setDispatchModalReport(rep); }}
        />
      )}

      {/* ── DISPATCH MODAL (Pick MRF Staff) ── */}
      {dispatchModalReport && (
        <ModalPortal>
        <div
          data-testid="modal-overlay"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5 relative max-h-[92dvh] overflow-y-auto">
            <button
              onClick={() => setDispatchModalReport(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="h-10 w-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--text-strong)] flex items-center justify-center font-bold">
                <Send size={20} />
              </div>
              <div>
                <h3 className="text-base font-heading font-black text-[var(--text-strong)]">Dispatch MRF Collector</h3>
                <p className="text-[11px] text-gray-500 font-medium">Assign a collector to handle this site request</p>
              </div>
            </div>

            <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Incident Location</label>
                <input
                  type="text"
                  readOnly
                  value={cleanLocationName(dispatchModalReport.locationName)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-[var(--text-strong)] font-bold outline-none"
                />
                {(dispatchModalReport.isScatteredDebris || dispatchModalReport.locationName.toLowerCase().includes('scattered')) && dispatchModalReport.coordinates && (
                  <p className="text-[10px] text-gray-500 font-mono mt-1 flex items-center gap-1">
                    <Navigation size={10} className="text-[var(--accent)]" /> Grid [{dispatchModalReport.coordinates.lat.toFixed(4)}, {dispatchModalReport.coordinates.lng.toFixed(4)}]
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select MRF Staff Member</label>
                <select
                  value={selectedMrfId}
                  onChange={e => setSelectedMrfId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 font-semibold outline-none focus:border-[var(--primary)] focus:bg-white cursor-pointer"
                >
                  <option value="">-- Pick MRF Personnel --</option>
                  {users.filter(u => u.role === 'MRF').map(mrf => (
                    <option key={mrf.id} value={mrf.id}>
                      {mrf.name} ({mrf.employeeId})
                    </option>
                  ))}
                  {users.filter(u => u.role === 'MRF').length === 0 && (
                    <option value="mrf-default">MRF Dispatch Operations Team</option>
                  )}
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)] text-white text-xs font-bold shadow-md shadow-[var(--primary)]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} /> Confirm Dispatch Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Reject Confirmation Modal */}
      {rejectConfirmReport && (
        <ModalPortal>
        <div
          data-testid="modal-overlay"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div className="bg-white border border-white/80 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up max-h-[92dvh] overflow-y-auto">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-rose-500 to-orange-500 px-5 sm:px-7 py-6 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20" />
                <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/15" />
              </div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30">
                  <AlertOctagon size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-black tracking-tight">Report Dismissal</h3>
                  <p className="text-[11px] text-white/70 font-medium mt-0.5">Offense auto-determined by reporter history</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 sm:px-7 py-6 space-y-5">
              {/* Reporter Info Card */}
              <div className="bg-[var(--background)] rounded-2xl p-4 border border-[var(--primary)]/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider">Reporter</span>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[9px] font-black uppercase border border-rose-200">False Report</span>
                </div>
                <p className="text-sm font-extrabold text-[var(--text-strong)]">{rejectConfirmReport.reporterName}</p>
                <div className="flex items-start gap-2 pt-1">
                  <p className="text-[11px] text-[var(--text-strong)]/50 font-medium leading-relaxed line-clamp-2">
                    "{rejectConfirmReport.title}" at {rejectConfirmReport.locationName}
                  </p>
                </div>
              </div>

              {/* Auto-determined Offense Level */}
              {(() => {
                const reporter = users.find(u => u.id === rejectConfirmReport.reporterId);
                const level = (reporter?.warningsCount ?? 0) + 1;
                const autoSeverity: 'WARNING' | 'DEDUCT' | 'SUSPENSION' =
                  level === 1 ? 'WARNING' : level === 2 ? 'DEDUCT' : 'SUSPENSION';
                const levelConfig = {
                  WARNING: { label: '1st Offense — Warning', desc: 'Logged to record only', icon: '⚠️', color: 'amber' },
                  DEDUCT: { label: '2nd Offense — Deduct Points', desc: `${settings?.dismissPointPenalty ?? 10} pts will be deducted`, icon: '💰', color: 'orange' },
                  SUSPENSION: { label: '3rd+ Offense — Account Suspension', desc: '1 day account ban', icon: '🚫', color: 'rose' },
                };
                const cfg = levelConfig[autoSeverity];
                return (
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider block">Offense Level (Auto)</label>
                    <div className={`py-3.5 px-4 rounded-2xl border-2 text-center ${
                      cfg.color === 'amber' ? 'border-amber-400 bg-amber-50' :
                      cfg.color === 'orange' ? 'border-orange-400 bg-orange-50' :
                      'border-rose-400 bg-rose-50'
                    }`}>
                      <div className="text-xl mb-1.5">{cfg.icon}</div>
                      <p className="text-[11px] font-extrabold text-[var(--text-strong)]">{cfg.label}</p>
                      <p className="text-[9px] font-bold text-[var(--text-strong)]/60 mt-0.5">{cfg.desc}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Offense Justification Note */}
              <div>
                <label className="text-[10px] font-bold text-[var(--text-strong)]/40 uppercase tracking-wider block mb-1.5">Offense Justification Note</label>
                <textarea
                  value={rejectJustification}
                  onChange={(e) => setRejectJustification(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-rose-500 outline-none resize-none font-medium text-xs"
                  placeholder="Enter justification for this offense..."
                />
              </div>

              {/* Action Buttons */}
              {(() => {
                const reporter = users.find(u => u.id === rejectConfirmReport.reporterId);
                const level = (reporter?.warningsCount ?? 0) + 1;
                const autoSeverity: 'WARNING' | 'DEDUCT' | 'SUSPENSION' =
                  level === 1 ? 'WARNING' : level === 2 ? 'DEDUCT' : 'SUSPENSION';
                return (
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => { setRejectConfirmReport(null); setRejectJustification('False report submission / Non-existent waste hazard'); }}
                      className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmRejectReport}
                      className={`flex-1 py-3 rounded-xl text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        autoSeverity === 'WARNING'
                          ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                          : autoSeverity === 'DEDUCT'
                            ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                            : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      Confirm {autoSeverity === 'WARNING' ? 'Warning' : autoSeverity === 'DEDUCT' ? `(-${settings?.dismissPointPenalty ?? 10} pts)` : '(1 Day Suspension)'}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

    </div>
  );
};
