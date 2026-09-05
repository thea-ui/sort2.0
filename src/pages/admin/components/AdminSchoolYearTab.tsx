import React, { useState, useEffect } from 'react';
import { useSchoolYear, SchoolYear } from '../../../hooks/useSchoolYear';
import {
  CalendarClock,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BarChart2,
  Users,
  FileText,
  Scale,
  X,
  RefreshCw,
} from 'lucide-react';

interface AdminSchoolYearTabProps {
  showToast: (msg: string) => void;
}

export const AdminSchoolYearTab: React.FC<AdminSchoolYearTabProps> = ({ showToast }) => {
  const { activeSchoolYear, allSchoolYears, loading, refresh, archiveSchoolYear, getSchoolYearDetails } = useSchoolYear();
  const [selectedSY, setSelectedSY] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async () => {
    if (!activeSchoolYear) return;
    if (!window.confirm(`Archive SY ${activeSchoolYear.label}? This will snapshot all data, reset student points, and start a new school year. This action cannot be undone.`)) return;

    setArchiving(true);
    try {
      const result = await archiveSchoolYear(activeSchoolYear.id);
      showToast(`Rollover complete! "${result.previousSchoolYear}" archived, "${result.newSchoolYear}" is now active.`);
    } catch (err: any) {
      showToast(`Rollover failed: ${err.message}`);
    } finally {
      setArchiving(false);
    }
  };

  const handleViewDetails = async (sy: SchoolYear) => {
    try {
      const details = await getSchoolYearDetails(sy.id);
      setSelectedSY(details);
      setShowDetail(true);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Academic Administration
          </span>
          <h3 className="text-xl font-heading font-black text-[#00271D] tracking-tight mt-1.5 flex items-center gap-2">
            <CalendarClock size={20} className="text-[#00A77C]" />
            School Year Management
          </h3>
          <p className="text-xs text-[#00271D]/50 mt-0.5">
            View school year history, manage rollover, and access archived data.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Active School Year Card */}
      {activeSchoolYear && (
        <div className="bg-gradient-to-br from-[#00271D] via-[#003a2b] to-[#00271D] rounded-3xl p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #00A77C 0%, transparent 50%), radial-gradient(circle at 80% 20%, #00A77C 0%, transparent 50%)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-black bg-[#00A77C] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">Active</span>
              <span className="text-[9px] font-bold text-white/50">Current School Year</span>
            </div>
            <h2 className="text-3xl font-heading font-black">SY {activeSchoolYear.label}</h2>
            <div className="flex items-center gap-4 mt-3 text-white/60 text-xs">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {new Date(activeSchoolYear.startDate).toLocaleDateString()} — {new Date(activeSchoolYear.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleArchive}
                disabled={archiving}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                <Archive size={13} />
                {archiving ? 'Processing...' : 'Trigger Rollover'}
              </button>
              <button
                type="button"
                onClick={() => handleViewDetails(activeSchoolYear)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <BarChart2 size={13} /> View Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rollover Info */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-800">
          <p className="font-bold">Automatic Rollover</p>
          <p className="mt-0.5 text-sky-600">
            When EnrollPro switches to a new school year, the system automatically detects the change and triggers a rollover.
            All reports, points, offenses, and sales are archived with the school year. Student points reset to 0.
            Persistent inventory items carry forward. Market stocks reset with opening balances.
          </p>
        </div>
      </div>

      {/* School Year History */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock size={14} className="text-[#00A77C]" />
          <h4 className="text-sm font-heading font-bold text-[#00271D]">School Year History</h4>
        </div>
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw size={20} className="mx-auto text-gray-300 animate-spin" />
            <p className="text-xs text-gray-400 mt-2">Loading...</p>
          </div>
        ) : allSchoolYears.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarClock size={24} className="mx-auto text-gray-300" />
            <p className="text-xs text-gray-400 mt-2">No school years found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {allSchoolYears.map(sy => (
              <div key={sy.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${sy.isActive ? 'bg-[#00A77C] animate-pulse' : sy.isArchived ? 'bg-gray-300' : 'bg-amber-400'}`} />
                  <div>
                    <p className="text-sm font-bold text-[#00271D]">SY {sy.label}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(sy.startDate).toLocaleDateString()} — {new Date(sy.endDate).toLocaleDateString()}
                      {sy._count && ` · ${sy._count.reports} reports · ${sy._count.saleTransactions} sales`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sy.isActive && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#00A77C]/10 text-[#00A77C] border border-[#00A77C]/20">Active</span>
                  )}
                  {sy.isArchived && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500 border border-gray-200">Archived</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleViewDetails(sy)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold hover:bg-gray-200 cursor-pointer"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetail && selectedSY && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setShowDetail(false); setSelectedSY(null); } }}>
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-[#00271D] to-[#003a2b] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div>
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">School Year Details</span>
                <h3 className="text-lg font-bold text-white">SY {selectedSY.label}</h3>
              </div>
              <button type="button" onClick={() => { setShowDetail(false); setSelectedSY(null); }} className="p-1 text-white/40 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-[#00271D]">{selectedSY._count?.reports || 0}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Reports</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-[#00271D]">{selectedSY._count?.pointHistories || 0}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Point Transactions</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-[#00271D]">{selectedSY._count?.offenses || 0}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Offenses</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-[#00271D]">{selectedSY._count?.saleTransactions || 0}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Sales</p>
                </div>
              </div>

              {/* Market Stock Snapshots */}
              {selectedSY.marketStockSnapshots?.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-[#00271D] mb-2">Market Stock Snapshots</h5>
                  <div className="space-y-2">
                    {selectedSY.marketStockSnapshots.map((snap: any) => (
                      <div key={snap.id} className="flex justify-between items-center text-xs bg-gray-50 rounded-xl p-3">
                        <span className="font-bold text-[#00271D]">{snap.categoryName}</span>
                        <span className="text-gray-500">
                          {snap.openingKg > 0 && `Opening: ${snap.openingKg}kg · `}
                          Closing: {snap.closingKg}kg
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Students */}
              {selectedSY.pointSnapshots?.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-[#00271D] mb-2">Top Students (Archived Points)</h5>
                  <div className="space-y-2">
                    {selectedSY.pointSnapshots.slice(0, 10).map((snap: any, idx: number) => (
                      <div key={snap.id} className="flex justify-between items-center text-xs bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-400 w-5">#{idx + 1}</span>
                          <span className="font-bold text-[#00271D]">{snap.user?.name || 'Unknown'}</span>
                        </div>
                        <span className="font-black text-[#00A77C]">{snap.closingPoints} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
