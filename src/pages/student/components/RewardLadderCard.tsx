import React, { useCallback, useEffect, useState } from 'react';
import { Gift, Loader2, CheckCircle2, Clock3, Lock, Coins, Package } from 'lucide-react';
import { apiService } from '../../../services/api';
import { Reward, RewardClaim } from '../../../types';

const CLAIM_STATE: Record<string, { label: string; className: string }> = {
  UNLOCKED: { label: 'Ready to claim', className: 'bg-[var(--gold)]/10 text-[#8a6b12] border-[var(--gold)]/30' },
  REQUESTED: { label: 'Waiting for release', className: 'bg-[var(--primary)]/10 text-[var(--text-strong)] border-[var(--primary)]/25' },
  RELEASED: { label: 'Claimed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export const RewardLadderCard: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [yearGrams, setYearGrams] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiService.getRewards();
      setRewards(res.rewards || []);
      setYearGrams(res.yearGrams || 0);
    } catch {
      // Non-fatal: card simply stays empty.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reserve = async (claim: RewardClaim) => {
    setBusyId(claim.id);
    setMessage(null);
    try {
      await apiService.requestRewardClaim(claim.id);
      setMessage(`Reserved "${claim.reward?.title}". Show code ${claim.claimCode} at the MRF/Admin office.`);
      await load();
    } catch (err: any) {
      setMessage(err?.message || 'Failed to reserve claim');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center">
        <Loader2 size={18} className="mx-auto text-[var(--gold)] animate-spin" />
      </div>
    );
  }

  if (rewards.length === 0) return null;

  const topTier = rewards[rewards.length - 1]?.requiredGrams || 1;
  const overallPct = Math.min(100, Math.round((yearGrams / topTier) * 100));

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[var(--text-strong)]/50 uppercase tracking-widest flex items-center gap-2">
          <Gift size={14} className="text-[var(--gold)]" />
          <span>Milestone Prizes</span>
        </h3>
        <span className="text-[10px] font-black text-[var(--text-strong)]/60 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
          {(yearGrams / 1000).toFixed(2)} kg collected
        </span>
      </div>

      <div className="space-y-1">
        <div className="w-full bg-[var(--primary)]/10 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-[var(--gold)] to-[var(--gold)] h-full rounded-full transition-all duration-500"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <p className="text-[10px] font-semibold text-[var(--text-strong)]/40 text-right">{overallPct}% to the top tier</p>
      </div>

      {message && (
        <p className="text-[11px] font-bold text-[var(--accent)] bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-xl px-3 py-2">
          {message}
        </p>
      )}

      <div className="space-y-2.5">
        {rewards.map((reward) => {
          const claim = reward.claim;
          const unlocked = Boolean(reward.unlocked);
          const pct = Math.min(100, Math.round((yearGrams / reward.requiredGrams) * 100));
          const remaining = Math.max(0, reward.requiredGrams - yearGrams);
          const claimState = claim ? CLAIM_STATE[claim.status] : null;

          return (
            <div
              key={reward.id}
              className={`rounded-xl border p-3.5 space-y-2 ${
                unlocked ? 'border-[var(--gold)]/30 bg-[var(--gold)]/5' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      unlocked ? 'bg-[var(--gold)]/15 text-[var(--gold)]' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {unlocked ? <Gift size={15} /> : <Lock size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-extrabold ${unlocked ? 'text-[var(--text-strong)]' : 'text-[var(--text-strong)]/60'}`}>
                      {reward.title}
                    </p>
                    <p className="text-[10px] text-[var(--text-strong)]/50 font-semibold leading-snug">{reward.description}</p>
                    <p className="text-[10px] font-bold text-[var(--text-strong)]/40 mt-0.5 flex items-center gap-1">
                      {reward.rewardType === 'PHYSICAL' ? <Package size={10} /> : <Coins size={10} />}
                      {(reward.requiredGrams / 1000).toFixed(0)} kg tier
                      {reward.rewardType === 'POINTS' && reward.pointsValue > 0
                        ? ` · +${reward.pointsValue} pts`
                        : ''}
                    </p>
                  </div>
                </div>

                {claimState && (
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border shrink-0 ${claimState.className}`}>
                    {claimState.label}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="w-full bg-[var(--primary)]/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      unlocked ? 'bg-[var(--gold)]' : 'bg-[var(--primary)]/15'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--text-strong)]/50">
                  <span>{pct}%</span>
                  {!unlocked && <span>{(remaining / 1000).toFixed(2)} kg to go</span>}
                </div>
              </div>

              {claim && claim.status === 'UNLOCKED' && (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-[10px] font-black font-mono text-[var(--text-strong)] bg-white border border-[var(--gold)]/30 px-2 py-1 rounded-lg">
                    {claim.claimCode}
                  </span>
                  <button
                    type="button"
                    disabled={busyId === claim.id}
                    onClick={() => reserve(claim)}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-[10px] font-extrabold transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    {busyId === claim.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                    I&apos;ll claim this
                  </button>
                </div>
              )}

              {claim && claim.status === 'REQUESTED' && (
                <p className="text-[10px] font-bold text-[var(--text-strong)] flex items-center gap-1">
                  <Clock3 size={11} /> Show code{' '}
                  <span className="font-mono bg-white border border-[var(--primary)]/25 px-1.5 py-0.5 rounded">{claim.claimCode}</span>{' '}
                  at the MRF/Admin office.
                </p>
              )}

              {claim && claim.status === 'RELEASED' && (
                <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Prize released{claim.releasedAt ? ` on ${new Date(claim.releasedAt).toLocaleDateString()}` : ''}.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
