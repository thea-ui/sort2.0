import React from 'react';
import { CheckCircle2, Gift, Sparkles, X } from 'lucide-react';
import { RecordWalkInResult } from '../../../types';
import { formatLitres } from '../../../hooks/useWalkInTurnover';

interface WalkInReceiptProps {
  receipt: RecordWalkInResult;
  onClose: () => void;
}

export const WalkInReceipt: React.FC<WalkInReceiptProps> = ({ receipt, onClose }) => {
  const { turnover, student, progress, newlyUnlocked, alreadyProcessed } = receipt;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[var(--primary)] via-[var(--primary-light)] to-[var(--primary)] px-6 pt-6 pb-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Close receipt"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[var(--accent)]/20 ring-1 ring-[var(--accent)]/30 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {alreadyProcessed ? 'Turnover already recorded' : 'Turnover recorded'}
              </h3>
              <p className="text-[11px] text-white/60 font-semibold">{student.name}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-strong)]/40">Points credited</p>
            <p className="text-4xl font-heading font-black text-[var(--accent)]">+{turnover.pointsAwarded}</p>
            <p className="text-[11px] text-[var(--text-strong)]/50 font-bold">
              New balance: <span className="text-[var(--gold)]">{student.points} pts</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Bottles', value: String(turnover.totalBottles) },
              { label: 'Volume', value: `${formatLitres(turnover.totalMl)} L` },
              { label: 'Est. weight', value: `${(turnover.totalGrams / 1000).toFixed(2)} kg` },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-center">
                <p className="text-sm font-black text-[var(--text-strong)]">{stat.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Year progress */}
          {progress && (
            <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-2xl p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)] mb-1">
                This school year
              </p>
              <p className="text-xs font-bold text-[var(--text-strong)]">
                {(progress.yearGrams / 1000).toFixed(2)} kg collected · {progress.yearBottles} bottles
              </p>
              {progress.nextReward && (
                <p className="text-[10px] text-[var(--text-strong)]/50 font-semibold mt-0.5">
                  {(progress.nextReward.remainingGrams / 1000).toFixed(2)} kg to go for{' '}
                  <span className="text-[var(--text-strong)] font-bold">{progress.nextReward.title}</span>
                </p>
              )}
            </div>
          )}

          {/* Unlocked prizes */}
          {newlyUnlocked.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-[var(--gold)]" />
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--gold)]">
                  Milestone unlocked
                </span>
              </div>
              {newlyUnlocked.map((unlock) => (
                <div
                  key={unlock.claimId}
                  className="flex items-center justify-between gap-3 bg-[var(--gold)]/5 border border-[var(--gold)]/25 rounded-2xl px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Gift size={15} className="text-[var(--gold)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-[var(--text-strong)] truncate">{unlock.reward.title}</p>
                      <p className="text-[10px] text-[var(--text-strong)]/50 font-semibold">
                        {(unlock.reward.requiredGrams / 1000).toFixed(0)} kg tier
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black font-mono text-[var(--text-strong)] bg-white border border-[var(--gold)]/30 px-2 py-1 rounded-lg shrink-0">
                    {unlock.claimCode}
                  </span>
                </div>
              ))}
              <p className="text-[10px] text-[var(--text-strong)]/40 font-semibold text-center">
                Show this code at the MRF/Admin office to claim.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-extrabold shadow-md shadow-[var(--accent)]/25 transition-all cursor-pointer"
          >
            Done — Next Student
          </button>
        </div>
      </div>
    </div>
  );
};
