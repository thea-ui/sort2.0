import { RewardClaim } from '../../../types';

export const REWARD_CLAIM_STATUS_META: Record<RewardClaim['status'], { label: string; className: string }> = {
  REQUESTED: {
    label: 'Requested',
    className: 'border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[var(--gold-strong)]',
  },
  UNLOCKED: {
    label: 'Unlocked',
    className: 'border-[var(--primary)]/15 bg-[var(--primary)]/5 text-[var(--text-strong)]/70',
  },
  RELEASED: {
    label: 'Released',
    className: 'border-[var(--success)]/25 bg-[var(--success)]/10 text-[var(--success-strong)]',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'border-[var(--primary)]/10 bg-[var(--primary)]/5 text-[var(--text-strong)]/40',
  },
};

export const formatRewardClaimDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
