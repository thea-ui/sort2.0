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
} from 'lucide-react';
import { Report, User as UserType, ReportStatus } from '../../../types';

interface AdminReportsTabProps {
  reports: Report[];
  users: UserType[];
  verifyReport: (reportId: string) => void;
  dispatchReport: (reportId: string, mrfId: string, mrfName: string) => void;
  updateReportStatus: (reportId: string, status: ReportStatus, weightCollected?: number) => void;
  addOffense: (userId: string, description: string, severity: 'WARNING' | 'STRIKE' | 'SUSPENSION') => void;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({
  reports,
  users,
  verifyReport,
  dispatchReport,
  addOffense,
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

  // Toast / Notification Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Filter Reports
  const filteredReports = reports.filter(r => {
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
    if (statusFilter === 'DONE' && r.status !== 'COLLECTED' && r.status !== 'RESOLVED') return false;

    return true;
  });

  // Group Reports by Location Name
  const groupedMap: Record<string, Report[]> = {};
  filteredReports.forEach(r => {
    const locKey = r.locationName || 'General Campus Location';
    if (!groupedMap[locKey]) groupedMap[locKey] = [];
    groupedMap[locKey].push(r);
  });

  const locationGroups = Object.keys(groupedMap).map((locKey, index) => ({
    id: `group-${index}`,
    locationName: locKey,
    reports: groupedMap[locKey],
  }));

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleVerify = (report: Report) => {
    verifyReport(report.id);
    showNotification(`Report at "${report.locationName}" has been verified! Notification sent to ${report.reporterName}.`);
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
    if (report.reporterId) {
      addOffense(
        report.reporterId,
        `False or improper report submitted: "${report.title}" at ${report.locationName}`,
        'WARNING'
      );
    }
    showNotification(`Report marked as invalid/fake. Warning logged for ${report.reporterName}.`);
    if (eyeModalReport?.id === report.id) setEyeModalReport(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">

      {/* Toast Notification Banner */}
      {feedbackMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#00271D] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#00A77C]/40 flex items-center gap-3 animate-pulse">
          <CheckCircle2 size={18} className="text-[#00A77C]" />
          <span className="text-xs font-bold">{feedbackMsg}</span>
        </div>
      )}

      {/* Header Banner (Matches Screenshot 714 Header Spec) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#00271D]/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-[#00A77C] bg-[#00A77C]/15 border border-[#00A77C]/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Management Portal
            </span>
          </div>
          <h2 className="text-2xl font-heading font-black text-[#00271D] tracking-tight mt-1">All Reports</h2>
          <p className="text-xs text-[#00271D]/60 font-medium">{reports.length} total reports submitted across campus nodes</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => showNotification("Refreshed reports feed")}
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-[#00271D] flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
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
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
            activeFilter === 'ALL'
              ? 'bg-[#00A77C] text-white shadow-md shadow-[#00A77C]/20'
              : 'bg-white border border-gray-200 text-[#00271D]/70 hover:bg-gray-50'
          }`}
        >
          <FileText size={15} /> All Reports
        </button>

        <button
          onClick={() => setActiveFilter('WASTE')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
            activeFilter === 'WASTE'
              ? 'bg-[#00A77C] text-white shadow-md shadow-[#00A77C]/20'
              : 'bg-white border border-gray-200 text-[#00271D]/70 hover:bg-gray-50'
          }`}
        >
          <Recycle size={15} /> Waste
        </button>

        <button
          onClick={() => setActiveFilter('ASSET')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
            activeFilter === 'ASSET'
              ? 'bg-[#00A77C] text-white shadow-md shadow-[#00A77C]/20'
              : 'bg-white border border-gray-200 text-[#00271D]/70 hover:bg-gray-50'
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
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#00A77C] focus:bg-white transition-all text-[#00271D]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#00A77C] font-semibold text-[#00271D] cursor-pointer"
        >
          <option value="ALL">All Status</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="VERIFIED">Verified</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="DONE">Done / Completed</option>
        </select>
      </div>

      {/* Select All Sub-bar */}
      <div className="flex items-center gap-2 px-2 text-xs font-semibold text-[#00271D]/60">
        <input type="checkbox" id="selectAll" className="rounded text-[#00A77C] focus:ring-[#00A77C]" />
        <label htmlFor="selectAll" className="cursor-pointer">Select All ({filteredReports.length})</label>
      </div>

      {/* Grouped Location Containers (Matches Screenshot 714 Card Layout) */}
      <div className="space-y-4">
        {locationGroups.length === 0 ? (
          <div className="bg-white/80 border border-gray-200 rounded-3xl p-12 text-center text-gray-400 space-y-2">
            <Package size={32} className="mx-auto text-gray-300" />
            <p className="text-sm font-bold text-[#00271D]">No reports match your filters.</p>
            <p className="text-xs">Try selecting a different status filter or clear your search.</p>
          </div>
        ) : (
          locationGroups.map(group => {
            const isExpanded = expandedGroups[group.id] !== false; // default open
            const firstReport = group.reports[0];
            const isGroupDispatched = group.reports.length > 0 && group.reports.every(r => r.status === 'DISPATCHED' || r.status === 'COLLECTED' || r.status === 'RESOLVED');
            const assignedMrfName = group.reports.find(r => r.assignedMrfName)?.assignedMrfName;

            return (
              <div
                key={group.id}
                className="bg-[#e0f2ec]/40 border border-[#00271D]/10 rounded-2xl p-4 shadow-sm space-y-3 transition-all hover:border-[#00A77C]/30"
              >
                {/* Group Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-[#00A77C] text-white flex items-center justify-center shadow-md shadow-[#00A77C]/20 shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-heading font-black text-[#00271D]">
                        {group.locationName}
                      </h3>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#00271D]/50 mt-0.5">
                        {group.reports.length} REPORT · {group.reports.filter(r => r.status === 'PENDING').length} ACTIVE
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isGroupDispatched ? (
                      <button
                        disabled
                        className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-900 border border-emerald-300 text-xs font-black shadow-xs flex items-center gap-1.5 cursor-not-allowed opacity-90"
                      >
                        <CheckCircle2 size={13} className="text-[#00A77C]" />
                        Dispatched {assignedMrfName ? `(${assignedMrfName})` : ''}
                      </button>
                    ) : (
                      <button
                        onClick={() => setDispatchModalReport(firstReport)}
                        className="px-4 py-2 rounded-xl bg-[#1D61E8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send size={13} /> Dispatch Collector
                      </button>
                    )}

                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-[#00271D] transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Group Nested Reports List */}
                {isExpanded && (
                  <div className="divide-y divide-gray-200/60 pt-2 space-y-2">
                    {group.reports.map(rep => {
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
                          className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[#00A77C]/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input type="checkbox" className="rounded text-[#00A77C] focus:ring-[#00A77C] shrink-0" />
                            <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badgeBg} shrink-0`}>
                              {badgeType}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#00271D] truncate">{rep.title}</p>
                              <p className="text-[11px] text-[#00271D]/60 font-medium mt-0.5 flex items-center gap-1 truncate">
                                <span>{rep.reporterName}</span>
                                <span className="text-[9px] font-bold text-[#00A77C] bg-[#00A77C]/10 px-1.5 py-0.2 rounded-full uppercase">
                                  {rep.reporterRole || 'student'}
                                </span>
                                <span>· {rep.timestamp}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            {/* Verification / Status Badge */}
                            {!rep.isVerified && rep.status === 'PENDING' ? (
                              <span className="px-3 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                                Unverified
                              </span>
                            ) : rep.isVerified && rep.status === 'PENDING' ? (
                              <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 size={11} /> Verified
                              </span>
                            ) : rep.status === 'DISPATCHED' ? (
                              <span className="px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider">
                                Dispatched ({rep.assignedMrfName || 'MRF'})
                              </span>
                            ) : (
                              <span className="px-3 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-black uppercase tracking-wider">
                                Done / Completed
                              </span>
                            )}

                            {/* Eye Icon Button */}
                            <button
                              onClick={() => setEyeModalReport(rep)}
                              className="p-2 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
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
              </div>
            );
          })
        )}
      </div>

      {/* ── EYE MODAL (Report Preview & Verification) ── */}
      {eyeModalReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
            <button
              onClick={() => setEyeModalReport(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="h-10 w-10 rounded-2xl bg-[#00A77C]/15 text-[#00A77C] flex items-center justify-center font-bold">
                <Eye size={20} />
              </div>
              <div>
                <h3 className="text-base font-heading font-black text-[#00271D]">Report Audit Inspection</h3>
                <p className="text-[11px] text-gray-500 font-medium">Verify authenticity before dispatching MRF staff</p>
              </div>
            </div>

            {/* Reporter details */}
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80 flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reporter Account</p>
                <p className="font-bold text-[#00271D] mt-0.5">{eyeModalReport.reporterName}</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase border border-emerald-200">
                {eyeModalReport.reporterRole || 'student'}
              </span>
            </div>

            {/* Conditional Content: Bin Photo for Waste vs Location Name ONLY for Assets */}
            {eyeModalReport.reportType === 'ASSET' ||
            eyeModalReport.description.toUpperCase().includes('[PILLAR: FURNITURE]') ||
            eyeModalReport.description.toUpperCase().includes('[PILLAR: ELECTRONICS]') ||
            eyeModalReport.description.toUpperCase().includes('[PILLAR: FIXTURES]') ||
            eyeModalReport.description.toUpperCase().includes('[PILLAR: EQUIPMENT]') ||
            eyeModalReport.description.toUpperCase().includes('[PILLAR: OTHER]') ? (
              
              /* ASSET REPORT: Displays Location Name ONLY (No picture required) */
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                    <MapPin size={12} /> Asset Incident Location
                  </p>
                  <p className="text-base font-heading font-black text-[#00271D]">
                    {eyeModalReport.locationName}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700">
                  <p className="font-bold text-gray-900 mb-1">Asset Notes:</p>
                  <p>{eyeModalReport.description}</p>
                </div>
              </div>

            ) : (

              /* WASTE REPORT: Displays Student / Teacher Bin Photo & Location */
              <div className="space-y-3">
                <div className="rounded-2xl overflow-hidden border border-gray-200 h-48 bg-gray-100 relative shadow-inner">
                  {eyeModalReport.imageUrl ? (
                    <img src={eyeModalReport.imageUrl} alt="Waste report" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center space-y-1">
                      <Package size={32} />
                      <p className="text-xs font-semibold">Standard Container Location Image Attached</p>
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg font-mono">
                    GPS: {eyeModalReport.coordinates.lat.toFixed(4)}, {eyeModalReport.coordinates.lng.toFixed(4)}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700">
                  <p className="font-bold text-gray-900 mb-1">Bin Location: {eyeModalReport.locationName}</p>
                  <p>{eyeModalReport.description}</p>
                </div>
              </div>
            )}

            {/* Modal Verification Actions */}
            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              {!eyeModalReport.isVerified ? (
                <>
                  <button
                    onClick={() => {
                      handleVerify(eyeModalReport);
                      setEyeModalReport(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#00A77C] hover:bg-[#008f6a] text-white text-xs font-bold shadow-md shadow-[#00A77C]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={15} /> Confirm & Verify Report
                  </button>

                  <button
                    onClick={() => handleRejectReport(eyeModalReport)}
                    className="py-3 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <AlertOctagon size={15} /> Mark Fake / Warning
                  </button>
                </>
              ) : (
                <div className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} /> Report Verified by Admin
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DISPATCH MODAL (Pick MRF Staff) ── */}
      {dispatchModalReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setDispatchModalReport(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-100 text-[#1D61E8] flex items-center justify-center font-bold">
                <Send size={20} />
              </div>
              <div>
                <h3 className="text-base font-heading font-black text-[#00271D]">Dispatch MRF Collector</h3>
                <p className="text-[11px] text-gray-500 font-medium">Assign a collector to handle this site request</p>
              </div>
            </div>

            <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Incident Location</label>
                <input
                  type="text"
                  readOnly
                  value={dispatchModalReport.locationName}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-[#00271D] font-bold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select MRF Staff Member</label>
                <select
                  value={selectedMrfId}
                  onChange={e => setSelectedMrfId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 font-semibold outline-none focus:border-[#1D61E8] focus:bg-white cursor-pointer"
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
                  className="flex-1 py-3 rounded-xl bg-[#1D61E8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} /> Confirm Dispatch Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
