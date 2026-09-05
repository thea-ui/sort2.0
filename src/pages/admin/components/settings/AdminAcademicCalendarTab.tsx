import React, { useState, useEffect } from 'react';
import { RefreshCw, Edit2, X, CalendarDays, ArrowRight } from 'lucide-react';
import { apiService } from '../../../../services/api';

interface TermItem {
  id: string;
  quarterName: string;
  quarterCode: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const DEFAULT_TERMS: TermItem[] = [
  { id: 't-1', quarterName: 'Term 1', quarterCode: 'T1', startDate: 'Jun 8, 2026', endDate: 'Sep 15, 2026', isActive: true },
  { id: 't-2', quarterName: 'Term 2', quarterCode: 'T2', startDate: 'Sep 16, 2026', endDate: 'Dec 18, 2026', isActive: false },
  { id: 't-3', quarterName: 'Term 3', quarterCode: 'T3', startDate: 'Jan 4, 2027', endDate: 'Apr 8, 2027', isActive: false },
];

function formatDate(d: string): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const AdminAcademicCalendarTab: React.FC = () => {
  const [terms, setTerms] = useState<TermItem[]>(DEFAULT_TERMS);
  const [editingTerm, setEditingTerm] = useState<TermItem | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadTerms = async () => {
    try {
      const data = await apiService.getAcademicQuarters();
      if (Array.isArray(data) && data.length > 0) {
        setTerms(data);
      }
    } catch (err) {
      console.warn('Failed to fetch terms from API:', err);
    }
  };

  useEffect(() => { loadTerms(); }, []);

  const handleSyncFromEnrollPro = async () => {
    setSyncing(true);
    try {
      const token = sessionStorage.getItem('sortv2_token');
      const res = await fetch('http://localhost:5000/api/sync/terms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await loadTerms();
    } catch (err) {
      console.error('Sync failed:', err);
    }
    setSyncing(false);
  };

  const handleSaveTermDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerm) return;
    setTerms(prev => prev.map(t => t.id === editingTerm.id ? { ...t, startDate: editingTerm.startDate, endDate: editingTerm.endDate } : t));
    setEditingTerm(null);
    try { await apiService.updateAcademicQuarter(editingTerm.id, { startDate: editingTerm.startDate, endDate: editingTerm.endDate }); } catch {}
  };

  const activeTerm = terms.find(t => t.isActive);
  const activeDays = activeTerm ? getDaysRemaining(activeTerm.endDate) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-[#00271D] flex items-center gap-2">
            <CalendarDays size={22} className="text-[#00A77C]" />
            Academic Calendar
          </h3>
          <p className="text-sm text-[#00271D]/50 mt-0.5">
            {terms.length > 0 ? `${terms[0]?.startDate?.split(',')[1]?.trim() || 'Current SY'} – ${terms[terms.length - 1]?.endDate?.split(',')[1]?.trim() || ''}` : 'School Year'} · {terms.length || 3}-Term System · Synced from EnrollPro
          </p>
        </div>
        <button
          type="button"
          onClick={handleSyncFromEnrollPro}
          disabled={syncing}
          className="px-5 py-2.5 bg-[#00A77C] hover:bg-[#008f6a] text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
        >
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync from EnrollPro'}
        </button>
      </div>

      {/* Active Term Hero */}
      {activeTerm && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#00271D] via-[#004D3A] to-[#00A77C] p-8 text-white shadow-2xl shadow-[#00271D]/30">
          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-[#00A77C]/20" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">Currently Active</span>
              </div>
              <h3 className="text-4xl font-black tracking-tight">{activeTerm.quarterName}</h3>
              <div className="flex items-center gap-3 text-sm font-semibold text-white/80">
                <CalendarDays size={16} />
                <span>{formatDate(activeTerm.startDate)}</span>
                <ArrowRight size={14} />
                <span>{formatDate(activeTerm.endDate)}</span>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end gap-1 bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-5 border border-white/10">
              <span className="text-6xl font-black leading-none">{activeDays}</span>
              <span className="text-sm font-bold text-white/70 uppercase tracking-wider">days remaining</span>
            </div>
          </div>
        </div>
      )}

      {/* All Terms */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {terms.map((t, idx) => {
          const days = getDaysRemaining(t.endDate);
          const isPast = days < 0;
          const isCurrent = t.isActive;

          return (
            <div
              key={t.id || t.quarterCode}
              className={`rounded-3xl p-6 border-2 transition-all relative group ${
                isCurrent
                  ? 'bg-white border-[#00A77C] shadow-lg shadow-[#00A77C]/10'
                  : isPast
                    ? 'bg-gray-50 border-gray-200 opacity-60'
                    : 'bg-white border-gray-200 hover:border-[#00A77C]/40 hover:shadow-md'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-6 px-3 py-0.5 bg-[#00A77C] text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                  Active
                </span>
              )}

              <h4 className="text-xl font-black text-[#00271D]">{t.quarterName}</h4>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider mb-0.5">Starts</p>
                  <p className="text-lg font-bold text-[#00271D]">{formatDate(t.startDate)}</p>
                </div>
                <div className="w-full h-px bg-gray-200" />
                <div>
                  <p className="text-[10px] font-bold text-[#00271D]/40 uppercase tracking-wider mb-0.5">Ends</p>
                  <p className="text-lg font-bold text-[#00271D]">{formatDate(t.endDate)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs font-bold ${isPast ? 'text-gray-400' : isCurrent ? 'text-[#00A77C]' : 'text-[#00271D]/40'}`}>
                  {isPast ? 'Completed' : isCurrent ? `${days} days left` : `In ${Math.abs(days)} days`}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingTerm(t)}
                  className="p-2 rounded-xl text-[#00271D]/30 hover:text-[#00A77C] hover:bg-[#00A77C]/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Edit Dates"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingTerm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-white space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-2xl font-black text-[#00271D]">Edit {editingTerm.quarterName}</h3>
              <button type="button" onClick={() => setEditingTerm(null)} className="p-2 rounded-xl hover:bg-gray-100 text-[#00271D]/40 hover:text-[#00271D]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTermDates} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">Start Date</label>
                <input
                  type="text"
                  required
                  value={editingTerm.startDate}
                  onChange={(e) => setEditingTerm({ ...editingTerm, startDate: e.target.value })}
                  className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-[#00271D] outline-none focus:border-[#00A77C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#00271D]/50 uppercase">End Date</label>
                <input
                  type="text"
                  required
                  value={editingTerm.endDate}
                  onChange={(e) => setEditingTerm({ ...editingTerm, endDate: e.target.value })}
                  className="w-full mt-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-[#00271D] outline-none focus:border-[#00A77C]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingTerm(null)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200 cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-[#00A77C] text-white font-extrabold rounded-xl shadow-md text-sm hover:bg-[#008f6a] cursor-pointer">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
