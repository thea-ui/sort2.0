import React, { useState } from 'react';
import { useSchoolYear, SchoolYear } from '../../../hooks/useSchoolYear';
import { EditSchoolYearModal } from './EditSchoolYearModal';
import {
  CalendarClock,
  Clock,
  BarChart2,
  X,
  RefreshCw,
  Pencil,
  Power,
  PowerOff,
  AlertTriangle,
  Lock,
  Coins,
} from 'lucide-react';

interface AdminSchoolYearTabProps {
  showToast: (msg: string) => void;
  onOpenLedger?: (id: string) => void;
}

export const AdminSchoolYearTab: React.FC<AdminSchoolYearTabProps> = ({ showToast, onOpenLedger }) => {
  const {
    activeSchoolYear,
    allSchoolYears,
    loading,
    error,
    refresh,
    updateSchoolYear,
    activateSchoolYear,
    deactivateSchoolYear,
    getSchoolYearDetails,
  } = useSchoolYear();

  const [selectedSY, setSelectedSY] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SchoolYear | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleViewDetails = async (sy: SchoolYear) => {
    try {
      const details = await getSchoolYearDetails(sy.id);
      setSelectedSY(details);
      setShowDetail(true);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleViewLedger = (sy: SchoolYear) => {
    if (onOpenLedger) {
      onOpenLedger(sy.id);
    } else {
      showToast('Ledger page unavailable.');
    }
  };

  const handleEdit = async (id: string, data: { label?: string; startDate?: string; endDate?: string }) => {
    await updateSchoolYear(id, data);
    showToast('School year updated.');
  };

  const handleActivate = async (sy: SchoolYear) => {
    if (!window.confirm(`Activate SY ${sy.label}? This will deactivate the current active year.`)) return;
    setActionLoading(sy.id);
    try {
      await activateSchoolYear(sy.id);
      showToast(`SY ${sy.label} is now active.`);
    } catch (err: any) {
      showToast(`Failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (sy: SchoolYear) => {
    const inactiveYears = allSchoolYears.filter((y) => !y.isActive && !y.isArchived && y.id !== sy.id);
    if (inactiveYears.length === 0) {
      showToast('Cannot deactivate: no replacement year available. Create another year first.');
      return;
    }
    const replacementId = inactiveYears[0].id;
    if (!window.confirm(`Deactivate SY ${sy.label}? SY ${inactiveYears[0].label} will become active.`)) return;
    setActionLoading(sy.id);
    try {
      await deactivateSchoolYear(sy.id, replacementId);
      showToast(`SY ${sy.label} deactivated. SY ${inactiveYears[0].label} is now active.`);
    } catch (err: any) {
      showToast(`Failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenEdit = (sy: SchoolYear) => {
    setEditTarget(sy);
    setShowEditModal(true);
  };

  const totalYears = allSchoolYears.length;
  const totalSales = allSchoolYears.reduce((sum, sy) => sum + (sy._count?.saleTransactions || 0), 0);

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
            Create, edit, and manage school year lifecycles. EnrollPro sync controls automatic rollover.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800">
            <p className="font-bold">Error</p>
            <p className="mt-0.5 text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {/* Rollover Info */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-800">
          <p className="font-bold">Automatic Rollover</p>
          <p className="mt-0.5 text-sky-600">
            EnrollPro synchronization controls automatic rollover. When EnrollPro switches to a new school year,
            the system detects the change and triggers a rollover automatically. Archived years are read-only.
          </p>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-black text-[#00271D]">{totalYears}</p>
          <p className="text-[10px] text-[#00271D]/50 font-bold uppercase tracking-wider">Total Years</p>
        </div>
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-black text-[#00A77C]">{activeSchoolYear?.label || '—'}</p>
          <p className="text-[10px] text-[#00271D]/50 font-bold uppercase tracking-wider">Active Year</p>
        </div>
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-black text-[#00271D]">{activeSchoolYear?._count?.reports || 0}</p>
          <p className="text-[10px] text-[#00271D]/50 font-bold uppercase tracking-wider">Active Reports</p>
        </div>
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-black text-[#00271D]">{totalSales}</p>
          <p className="text-[10px] text-[#00271D]/50 font-bold uppercase tracking-wider">Total Sales</p>
        </div>
      </div>

      {/* Active School Year Hero */}
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
              {activeSchoolYear._count && (
                <>
                  <span>·</span>
                  <span>{activeSchoolYear._count.reports} reports</span>
                  <span>·</span>
                  <span>{activeSchoolYear._count.saleTransactions} sales</span>
                </>
              )}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleViewDetails(activeSchoolYear)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <BarChart2 size={13} /> View Details
              </button>
              <button
                type="button"
                onClick={() => handleViewLedger(activeSchoolYear)}
                className="px-4 py-2 rounded-xl bg-[#C69B26] hover:bg-[#b08a20] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Coins size={13} /> Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* School Year History Table */}
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
            {allSchoolYears.map((sy) => (
              <div key={sy.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${sy.isActive ? 'bg-[#00A77C] animate-pulse' : sy.isArchived ? 'bg-gray-300' : 'bg-amber-400'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#00271D] truncate">SY {sy.label}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(sy.startDate).toLocaleDateString()} — {new Date(sy.endDate).toLocaleDateString()}
                      {sy._count && ` · ${sy._count.reports} reports · ${sy._count.saleTransactions} sales`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Status Badge */}
                  {sy.isActive && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#00A77C]/10 text-[#00A77C] border border-[#00A77C]/20">Active</span>
                  )}
                  {sy.isArchived && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1">
                      <Lock size={9} /> Archived
                    </span>
                  )}
                  {!sy.isActive && !sy.isArchived && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Inactive</span>
                  )}

                  {/* Actions */}
                  <button
                    type="button"
                    onClick={() => handleViewDetails(sy)}
                    className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold hover:bg-gray-200 cursor-pointer"
                  >
                    Details
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewLedger(sy)}
                    className="px-2.5 py-1 rounded-lg bg-[#C69B26]/10 text-[#C69B26] text-[10px] font-bold hover:bg-[#C69B26]/20 cursor-pointer flex items-center gap-1"
                  >
                    <Coins size={10} /> Ledger
                  </button>

                  {/* Edit (inactive only) */}
                  {!sy.isActive && !sy.isArchived && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sy)}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold hover:bg-gray-200 cursor-pointer flex items-center gap-1"
                    >
                      <Pencil size={10} /> Edit
                    </button>
                  )}

                  {/* Activate (inactive only) */}
                  {!sy.isActive && !sy.isArchived && (
                    <button
                      type="button"
                      onClick={() => handleActivate(sy)}
                      disabled={actionLoading === sy.id}
                      className="px-2.5 py-1 rounded-lg bg-[#00A77C]/10 text-[#00A77C] text-[10px] font-bold hover:bg-[#00A77C]/20 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    >
                      <Power size={10} /> Activate
                    </button>
                  )}

                  {/* Deactivate (active only, if other inactive years exist) */}
                  {sy.isActive && allSchoolYears.some((y) => !y.isActive && !y.isArchived && y.id !== sy.id) && (
                    <button
                      type="button"
                      onClick={() => handleDeactivate(sy)}
                      disabled={actionLoading === sy.id}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold hover:bg-amber-100 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    >
                      <PowerOff size={10} /> Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditSchoolYearModal
        isOpen={showEditModal}
        schoolYear={editTarget}
        onClose={() => { setShowEditModal(false); setEditTarget(null); }}
        onSubmit={handleEdit}
      />

      {/* Detail Modal */}
      {showDetail && selectedSY && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowDetail(false); setSelectedSY(null); } }}>
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-br from-[#00271D] to-[#003a2b] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div>
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">School Year Details</span>
                <h3 className="text-lg font-bold text-white">SY {selectedSY.label}</h3>
              </div>
              <button type="button" onClick={() => { setShowDetail(false); setSelectedSY(null); }} className="p-1 text-white/40 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Status & Dates */}
              <div className="flex items-center gap-3 text-xs text-[#00271D]/70">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                  selectedSY.isActive ? 'bg-[#00A77C]/10 text-[#00A77C] border border-[#00A77C]/20' :
                  selectedSY.isArchived ? 'bg-gray-100 text-gray-500 border border-gray-200' :
                  'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {selectedSY.isActive ? 'Active' : selectedSY.isArchived ? 'Archived' : 'Inactive'}
                </span>
                <span>
                  {new Date(selectedSY.startDate).toLocaleDateString()} — {new Date(selectedSY.endDate).toLocaleDateString()}
                </span>
              </div>

              {selectedSY.enrollproId && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-700">
                  Linked to EnrollPro ID: <strong>{selectedSY.enrollproId}</strong>
                </div>
              )}

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
