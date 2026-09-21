import React from 'react';
import { Gift, Coins, Package, CheckCircle2, XCircle, Clock, User } from 'lucide-react';
import { RewardClaim } from '../../../types';

interface RewardClaimQueueProps {
  claims: RewardClaim[];
  busyId: string | null;
  onRelease: (claim: RewardClaim) => void;
  onCancel: (claim: RewardClaim) => void;
}

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: 'bg-[#C69B26]/10 text-[#8a6b12] border-[#C69B26]/30',
  UNLOCKED: 'bg-sky-50 text-sky-700 border-sky-200',
  RELEASED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const RewardClaimQueue: React.FC<RewardClaimQueueProps> = ({ claims, busyId, onRelease, onCancel }) => {
  if (claims.length === 0) {
    return (
      <div className="bg-white/90 border border-white/80 rounded-3xl p-12 text-center space-y-2">
        <div className="h-12 w-12 mx-auto rounded-2xl bg-[#C69B26]/10 text-[#C69B26] flex items-center justify-center">
          <Gift size={22} />
        </div>
        <p className="text-sm font-bold text-[#00271D]">No prize claims yet</p>
        <p className="text-xs text-[#00271D]/50">
          Claims appear here automatically when a student's bottle turn-ins cross a milestone.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {claims.map((claim) => {
        const isOpen = claim.status === 'UNLOCKED' || claim.status === 'REQUESTED';
        const isPhysical = claim.reward?.rewardType === 'PHYSICAL';
        const busy = busyId === claim.id;

        return (
          <div
            key={claim.id}
            className={`bg-white/95 border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              claim.status === 'REQUESTED' ? 'border-[#C69B26]/40 ring-1 ring-[#C69B26]/15' : 'border-white/80'
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isPhysical ? 'bg-[#C69B26]/10 text-[#C69B26]' : 'bg-[#00A77C]/10 text-[#00A77C]'
                }`}
              >
                {isPhysical ? <Package size={17} /> : <Coins size={17} />}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-extrabold text-[#00271D]">{claim.reward?.title}</p>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLE[claim.status]}`}>
                    {claim.status}
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-500">
                    {claim.reward?.requiredGrams ? `${(claim.reward.requiredGrams / 1000).toFixed(0)} kg tier` : 'Tier'}
                  </span>
                </div>
                <p className="text-[11px] text-[#00271D]/60 font-semibold flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1">
                    <User size={11} className="text-[#00A77C]" />
                    {claim.student?.name}
                    {claim.student?.sectionName ? ` · ${claim.student.sectionName}` : ''}
                  </span>
                  <span className="flex items-center gap-1 text-[#00271D]/40">
                    <Clock size={11} />
                    Unlocked {new Date(claim.unlockedAt).toLocaleDateString()}
                  </span>
                </p>
                {isPhysical && claim.reward?.stock !== null && claim.reward?.stock !== undefined && (
                  <p className="text-[10px] font-bold text-[#00271D]/40">Stock left: {claim.reward.stock}</p>
                )}
                {claim.reward?.rewardType === 'POINTS' && (claim.reward?.pointsValue ?? 0) > 0 && (
                  <p className="text-[10px] font-bold text-[#00A77C]">Releases +{claim.reward?.pointsValue} pts</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <span className="text-[11px] font-black font-mono text-[#00271D] bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
                {claim.claimCode}
              </span>
              {isOpen && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRelease(claim)}
                    className="px-4 py-2 rounded-xl bg-[#00A77C] hover:bg-[#008f6a] text-white text-[11px] font-extrabold shadow-sm shadow-[#00A77C]/25 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 size={13} /> {busy ? 'Releasing…' : 'Claim / Release'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onCancel(claim)}
                    className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                    aria-label="Cancel claim"
                  >
                    <XCircle size={15} />
                  </button>
                </>
              )}
              {claim.status === 'RELEASED' && claim.releasedAt && (
                <span className="text-[10px] font-bold text-emerald-700">
                  Released {new Date(claim.releasedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
