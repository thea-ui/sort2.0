import React from 'react';
import { ChevronRight, Coins, Gift, Package } from 'lucide-react';
import { RewardClaim } from '../../../types';
import { REWARD_CLAIM_STATUS_META } from './rewardClaimStyles';

interface RewardClaimQueueProps {
  claims: RewardClaim[];
  onReview: (claim: RewardClaim) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const RewardClaimQueue: React.FC<RewardClaimQueueProps> = ({
  claims,
  onReview,
  emptyTitle = 'No prize claims yet',
  emptyDescription = "Claims appear here automatically when a student's bottle turn-ins cross a milestone.",
}) => {
  if (claims.length === 0) {
    return (
      <div className="space-y-2 px-6 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--gold)]/10 text-[var(--gold-strong)]">
          <Gift size={22} />
        </div>
        <p className="text-sm font-bold text-[var(--text-strong)]">{emptyTitle}</p>
        <p className="text-xs text-[var(--text-strong)]/50">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <table className="w-full table-fixed text-left">
      <thead>
        <tr className="border-b border-[var(--primary)]/10">
          <th
            scope="col"
            className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-strong)]/35 sm:px-5"
          >
            Prize &amp; student
          </th>
          <th
            scope="col"
            className="hidden w-32 px-4 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-strong)]/35 md:table-cell"
          >
            Claim code
          </th>
          <th
            scope="col"
            className="w-28 px-4 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-strong)]/35"
          >
            Status
          </th>
          <th scope="col" className="w-12 px-4 py-2.5 sm:px-5">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--primary)]/10">
        {claims.map((claim) => {
          const isPhysical = claim.reward?.rewardType === 'PHYSICAL';
          const meta = REWARD_CLAIM_STATUS_META[claim.status];
          const prizeTitle = claim.reward?.title || 'Prize';
          const studentName = claim.student?.name || 'Unknown student';

          return (
            <tr
              key={claim.id}
              onClick={() => onReview(claim)}
              className={`cursor-pointer transition-colors hover:bg-[var(--accent)]/[0.04] ${
                claim.status === 'REQUESTED' ? 'bg-[var(--gold)]/[0.035]' : ''
              }`}
            >
              <td className="px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isPhysical
                        ? 'bg-[var(--gold)]/10 text-[var(--gold-strong)]'
                        : 'bg-[var(--accent)]/10 text-[var(--accent)]'
                    }`}
                  >
                    {isPhysical ? <Package size={17} /> : <Coins size={17} />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-[var(--text-strong)]">
                      {prizeTitle}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--text-strong)]/50">
                      {studentName}
                      {claim.student?.sectionName ? ` · ${claim.student.sectionName}` : ''}
                    </p>
                  </div>
                </div>
              </td>

              <td className="hidden px-4 py-3 text-center md:table-cell">
                <span className="inline-block max-w-full truncate rounded-lg border border-[var(--primary)]/10 bg-[var(--background)]/60 px-2 py-1 font-mono text-[10px] font-semibold text-[var(--text-strong)]/55">
                  {claim.claimCode}
                </span>
              </td>

              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${meta.className}`}
                >
                  {meta.label}
                </span>
              </td>

              <td className="px-4 py-3 text-right sm:px-5">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onReview(claim);
                  }}
                  aria-label={`Review ${prizeTitle} for ${studentName}`}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-strong)]/35 transition-colors hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
                >
                  <ChevronRight size={16} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
