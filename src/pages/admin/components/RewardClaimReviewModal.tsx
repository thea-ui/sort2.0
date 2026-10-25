import React from 'react';
import { Gift, User, XCircle } from 'lucide-react';
import { AppModal } from '../../../components/common/AppModal';
import { RewardClaim } from '../../../types';
import { REWARD_CLAIM_STATUS_META, formatRewardClaimDate } from './rewardClaimStyles';

interface RewardClaimReviewModalProps {
  claim: RewardClaim | null;
  busy: boolean;
  onClose: () => void;
  onRelease: (claim: RewardClaim) => void;
  onCancel: (claim: RewardClaim) => void;
}

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-strong)]/40">
      {label}
    </dt>
    <dd className="mt-1 truncate text-[12px] font-semibold text-[var(--text-strong)]">{value}</dd>
  </div>
);

export const RewardClaimReviewModal: React.FC<RewardClaimReviewModalProps> = ({
  claim,
  busy,
  onClose,
  onRelease,
  onCancel,
}) => {
  if (!claim) return null;

  const meta = REWARD_CLAIM_STATUS_META[claim.status];
  const isOpen = claim.status === 'UNLOCKED' || claim.status === 'REQUESTED';
  const isPhysical = claim.reward?.rewardType === 'PHYSICAL';
  const tier = claim.reward?.requiredGrams
    ? `${Math.round(claim.reward.requiredGrams / 1000)} kg tier`
    : 'Milestone reward';
  const studentClass =
    [claim.student?.gradeLevel, claim.student?.sectionName].filter(Boolean).join(' · ') || 'No class assigned';

  const description =
    claim.status === 'REQUESTED'
      ? 'The student requested this prize. Release it once it has been handed over — this cannot be undone.'
      : claim.status === 'UNLOCKED'
        ? 'This prize is unlocked and ready to hand over. Release it once it has been handed over — this cannot be undone.'
        : claim.status === 'RELEASED'
          ? `Released${claim.releasedAt ? ` on ${formatRewardClaimDate(claim.releasedAt)}` : ''}.`
          : 'This claim was cancelled.';

  return (
    <AppModal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      icon={<Gift />}
      title={claim.reward?.title || 'Prize claim'}
      description={description}
      size="sm"
      confirmLabel="Release prize"
      cancelLabel="Close"
      onConfirm={isOpen ? () => onRelease(claim) : undefined}
      confirmDisabled={busy}
      loading={busy}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/60 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <User size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--text-strong)]">
                {claim.student?.name || 'Unknown student'}
              </p>
              <p className="truncate text-[11px] font-medium text-[var(--text-strong)]/50">{studentClass}</p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${meta.className}`}
          >
            {meta.label}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/50 p-4">
          <DetailItem label="Claim code" value={<span className="font-mono">{claim.claimCode}</span>} />
          <DetailItem label="Tier" value={tier} />
          <DetailItem
            label={claim.requestedAt ? 'Requested' : 'Unlocked'}
            value={formatRewardClaimDate(claim.requestedAt || claim.unlockedAt)}
          />
          <DetailItem
            label={isPhysical ? 'Stock left' : 'Points value'}
            value={
              isPhysical
                ? claim.reward?.stock === null || claim.reward?.stock === undefined
                  ? 'Unlimited'
                  : `${claim.reward.stock} left`
                : `+${claim.reward?.pointsValue ?? 0} pts`
            }
          />
        </dl>

        {isOpen && (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--primary)]/10 pt-3">
            <span className="text-[10px] font-medium text-[var(--text-strong)]/40">
              Releasing a prize cannot be undone.
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => onCancel(claim)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger)]/5 px-3 py-1.5 text-[11px] font-bold text-[var(--danger)] transition-colors hover:border-[var(--danger)]/40 hover:bg-[var(--danger)]/10 disabled:opacity-50"
            >
              <XCircle size={13} />
              Cancel claim
            </button>
          </div>
        )}
      </div>
    </AppModal>
  );
};
