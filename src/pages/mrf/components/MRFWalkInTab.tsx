import React from 'react';
import { Recycle, User, Scale, Coins, FileText, CheckCircle2, Loader2, Clock, Gift } from 'lucide-react';
import { useMockData } from '../../../hooks/useMockData';
import {
  computeWalkInPoints,
  formatLitres,
  useWalkInTurnover,
} from '../../../hooks/useWalkInTurnover';
import { WalkInStudentPicker } from './WalkInStudentPicker';
import { BottleSizeStepper } from './BottleSizeStepper';
import { WalkInReceipt } from './WalkInReceipt';

interface MRFWalkInTabProps {
  showToast: (msg: string) => void;
}

export const MRFWalkInTab: React.FC<MRFWalkInTabProps> = ({ showToast }) => {
  const { settings } = useMockData();
  const ratePer500ml = settings?.walkInPointsPer500ml ?? 1;

  const {
    query,
    setQuery,
    results,
    searching,
    selected,
    setSelected,
    lines,
    setQuantity,
    notes,
    setNotes,
    totalMl,
    totalBottles,
    totalGrams,
    submitting,
    error,
    receipt,
    setReceipt,
    selectedProgress,
    today,
    submit,
    resetForm,
  } = useWalkInTurnover();

  const previewPoints = computeWalkInPoints(totalMl, ratePer500ml);
  const projectedGrams = (selectedProgress?.yearGrams ?? 0) + totalGrams;
  const nextReward = selectedProgress?.nextReward ?? null;
  const progressPct = nextReward ? Math.min(100, Math.round((projectedGrams / nextReward.requiredGrams) * 100)) : 100;
  const canSubmit = Boolean(selected) && totalBottles > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await submit();
    if (result) {
      showToast(
        result.alreadyProcessed
          ? 'Turnover was already recorded — no duplicate points.'
          : `Credited +${result.turnover.pointsAwarded} pts to ${result.student.name}!`
      );
    }
  };

  const closeReceipt = () => {
    setReceipt(null);
    resetForm();
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div>
        <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
          MRF Walk-in Station
        </span>
        <h3 className="text-lg font-heading font-black text-[#00271D] mt-1">Bottle Turn-in &amp; Points</h3>
        <p className="text-xs text-[#00271D]/50 mt-0.5">
          Search the student, tap bottle sizes, and credit points instantly. 500 ml = {ratePer500ml} pt
          {ratePer500ml === 1 ? '' : 's'}.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* LEFT: student + bottles */}
          <div className="lg:col-span-3 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm p-5 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-[#00A77C]/10 flex items-center justify-center">
                  <User size={13} className="text-[#00A77C]" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Step 1 · Student
                </span>
              </div>
              <WalkInStudentPicker
                query={query}
                setQuery={setQuery}
                results={results}
                searching={searching}
                selected={selected}
                onSelect={setSelected}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-[#00A77C]/10 flex items-center justify-center">
                  <Recycle size={13} className="text-[#00A77C]" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Step 2 · Count Bottles
                </span>
              </div>
              <BottleSizeStepper lines={lines} onChange={setQuantity} disabled={submitting} />
            </div>
          </div>

          {/* RIGHT: summary rail */}
          <div className="lg:col-span-2 bg-gray-50/70 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-[#00A77C]/10 flex items-center justify-center">
                <Scale size={13} className="text-[#00A77C]" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Step 3 · Confirm</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Bottles', value: String(totalBottles) },
                { label: 'Litres', value: formatLitres(totalMl) },
                { label: 'Est. kg', value: (totalGrams / 1000).toFixed(2) },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-gray-100 rounded-xl p-2.5 text-center">
                  <p className="text-sm font-black text-[#00271D]">{stat.value}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Points preview */}
            <div className="bg-white border border-[#00A77C]/25 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-[#C69B26]" />
                <span className="text-[11px] font-bold text-[#00271D]/60 uppercase tracking-wider">Points</span>
              </div>
              <span className="text-xl font-heading font-black text-[#00A77C]">+{previewPoints}</span>
            </div>

            {/* Milestone progress */}
            {selected && selectedProgress && (
              <div className="bg-white border border-[#C69B26]/25 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#C69B26] flex items-center gap-1">
                    <Gift size={11} /> Milestone progress
                  </span>
                  <span className="text-[10px] font-bold text-[#00271D]/60">
                    {(projectedGrams / 1000).toFixed(2)} kg
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#C69B26] to-[#FFAB00] transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                {nextReward ? (
                  <p className="text-[10px] text-[#00271D]/50 font-semibold">
                    {(Math.max(0, nextReward.requiredGrams - projectedGrams) / 1000).toFixed(2)} kg to{' '}
                    <span className="font-bold text-[#00271D]">{nextReward.title}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-[#00A77C] font-bold">All milestone tiers unlocked!</p>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Remarks</label>
              <div className="relative">
                <FileText size={13} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes…"
                  className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-xs text-[#00271D] outline-none resize-none focus:border-[#00A77C] focus:ring-2 focus:ring-[#00A77C]/20"
                />
              </div>
            </div>

            {error && (
              <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-auto w-full py-3.5 rounded-xl bg-[#00A77C] hover:bg-[#008f6a] text-white text-xs font-extrabold shadow-md shadow-[#00A77C]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {submitting ? 'Recording…' : 'Confirm & Credit Points'}
            </button>
          </div>
        </div>
      </form>

      {/* Today's station log */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-[#00A77C]" />
            <h4 className="text-sm font-heading font-bold text-[#00271D]">Today at the Station</h4>
          </div>
          <span className="text-[10px] font-extrabold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-2.5 py-1 rounded-full">
            {today.length} turnover{today.length === 1 ? '' : 's'}
          </span>
        </div>

        {today.length === 0 ? (
          <p className="text-xs text-gray-400 font-medium text-center py-6">
            No walk-in turnovers recorded today yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {today.map((turnover) => (
              <div
                key={turnover.id}
                className="flex items-center justify-between gap-3 bg-gray-50/70 border border-gray-100 rounded-2xl px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#00271D] truncate">
                    {turnover.student?.name || 'Student'}
                  </p>
                  <p className="text-[10px] text-[#00271D]/50 font-semibold">
                    {new Date(turnover.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                    {turnover.totalBottles} bottle{turnover.totalBottles === 1 ? '' : 's'} ·{' '}
                    {formatLitres(turnover.totalMl)} L · {(turnover.totalGrams / 1000).toFixed(2)} kg
                  </p>
                </div>
                <span className="text-xs font-black text-[#00A77C] shrink-0">+{turnover.pointsAwarded} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {receipt && <WalkInReceipt receipt={receipt} onClose={closeReceipt} />}
    </div>
  );
};
