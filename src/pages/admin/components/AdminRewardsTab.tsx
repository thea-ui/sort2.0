import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Gift, PackageCheck, Clock3, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { apiService } from '../../../services/api';
import { Reward, RewardClaim } from '../../../types';
import { RewardClaimQueue } from './RewardClaimQueue';
import { RewardClaimReviewModal } from './RewardClaimReviewModal';
import { RewardCatalogTable } from './RewardCatalogTable';
import { RewardEditModal } from './RewardEditModal';
import type { RewardPatch } from '../../../utils/rewardCatalog';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { LoadingState } from '../../../components/common/LoadingState';

interface AdminRewardsTabProps {
  showToast: (msg: string) => void;
}

interface PendingConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export const AdminRewardsTab: React.FC<AdminRewardsTabProps> = ({ showToast }) => {
  const [view, setView] = useState<'open' | 'history' | 'catalog'>('open');
  const [search, setSearch] = useState('');
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [catalog, setCatalog] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [reviewClaim, setReviewClaim] = useState<RewardClaim | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [claimsRes, catalogRes] = await Promise.all([
        apiService.getRewardClaims(),
        apiService.getRewardCatalog(),
      ]);
      setClaims(claimsRes.claims || []);
      setCatalog(catalogRes.rewards || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load rewards data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => {
    const awaiting = claims.filter((c) => c.status === 'UNLOCKED' || c.status === 'REQUESTED').length;
    const released = claims.filter((c) => c.status === 'RELEASED').length;
    const stockLeft = catalog
      .filter((r) => r.rewardType === 'PHYSICAL' && r.stock !== null && r.isActive !== false)
      .reduce((sum, r) => sum + (r.stock ?? 0), 0);
    return { awaiting, released, stockLeft };
  }, [claims, catalog]);

  const openClaims = useMemo(
    () => claims.filter((c) => c.status === 'UNLOCKED' || c.status === 'REQUESTED'),
    [claims],
  );
  const historyClaims = useMemo(
    () => claims.filter((c) => c.status === 'RELEASED' || c.status === 'CANCELLED'),
    [claims],
  );

  const query = search.trim().toLowerCase();
  const filteredOpenClaims = useMemo(
    () =>
      query
        ? openClaims.filter((claim) =>
            [
              claim.claimCode,
              claim.reward?.title,
              claim.reward?.code,
              claim.student?.name,
              claim.student?.sectionName,
            ].some((value) => value?.toLowerCase().includes(query)),
          )
        : openClaims,
    [openClaims, query],
  );
  const filteredHistoryClaims = useMemo(
    () =>
      query
        ? historyClaims.filter((claim) =>
            [
              claim.claimCode,
              claim.reward?.title,
              claim.reward?.code,
              claim.student?.name,
              claim.student?.sectionName,
            ].some((value) => value?.toLowerCase().includes(query)),
          )
        : historyClaims,
    [historyClaims, query],
  );
  const filteredCatalog = useMemo(
    () =>
      query
        ? catalog.filter((reward) =>
            [reward.title, reward.code, reward.description].some((value) =>
              value?.toLowerCase().includes(query),
            ),
          )
        : catalog,
    [catalog, query],
  );

  const releaseClaim = async (claim: RewardClaim, label: string) => {
    setBusyId(claim.id);
    try {
      const result = await apiService.releaseRewardClaim(claim.id);
      showToast(
        result.pointsAwarded > 0
          ? `Released ${label} — +${result.pointsAwarded} pts credited to ${result.claim.student?.name}.`
          : `Released ${label} to ${result.claim.student?.name}.`,
      );
      await refresh();
      setReviewClaim(null);
    } catch (err: any) {
      showToast(err?.message || 'Failed to release claim');
    } finally {
      setBusyId(null);
    }
  };

  const handleRelease = (claim: RewardClaim) => {
    void releaseClaim(claim, claim.reward?.title || 'this prize');
  };

  const cancelClaim = async (claim: RewardClaim) => {
    setBusyId(claim.id);
    try {
      await apiService.cancelRewardClaim(claim.id, 'Cancelled by admin');
      showToast('Claim cancelled.');
      await refresh();
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel claim');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = (claim: RewardClaim) => {
    setReviewClaim(null);
    setConfirmation({
      title: 'Cancel claim?',
      description: `Cancel claim ${claim.claimCode} for ${
        claim.student?.name || 'this student'
      }?`,
      confirmLabel: 'Cancel claim',
      destructive: true,
      onConfirm: () => {
        setConfirmation(null);
        void cancelClaim(claim);
      },
    });
  };

  const handleToggleActive = async (reward: Reward) => {
    setBusyId(reward.id);
    try {
      await apiService.updateReward(reward.id, { isActive: reward.isActive === false });
      showToast(`${reward.title} ${reward.isActive === false ? 'enabled' : 'disabled'}.`);
      await refresh();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update reward');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveReward = async (patch: RewardPatch) => {
    if (!editingReward) return;
    await apiService.updateReward(editingReward.id, patch);
    showToast(`${patch.title} updated.`);
    setEditingReward(null);
    await refresh();
  };

  const handleUpdateStock = async (reward: Reward, stock: number | null) => {
    setBusyId(reward.id);
    try {
      await apiService.updateReward(reward.id, { stock });
      showToast(`${reward.title} stock updated.`);
      await refresh();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update stock');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 divide-y divide-[var(--primary)]/10 overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          {
            label: 'Awaiting release',
            value: stats.awaiting,
            icon: Clock3,
            iconClassName: 'bg-[var(--ramp-4)]/10 text-[var(--ramp-4-strong)]',
          },
          {
            label: 'Released (loaded)',
            value: stats.released,
            icon: PackageCheck,
            iconClassName: 'bg-[var(--ramp-1)]/10 text-[var(--ramp-1-strong)]',
          },
          {
            label: 'Physical stock left',
            value: stats.stockLeft,
            icon: Gift,
            iconClassName: 'bg-[var(--ramp-2)]/10 text-[var(--ramp-2-strong)]',
          },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 p-4">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.iconClassName}`}
            >
              <stat.icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold leading-none tracking-tight text-[var(--text-strong)] tabular-nums">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)]/45">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600">
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="shrink-0 cursor-pointer rounded-xl border border-rose-200 bg-white px-3 py-1.5 transition-colors hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      )}

      {loading && claims.length === 0 && catalog.length === 0 ? (
        <LoadingState label="Loading rewards…" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white">
          <div className="flex flex-col gap-3 border-b border-[var(--primary)]/10 px-4 pt-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-0">
            <div
              className="flex min-w-0 flex-wrap items-center gap-x-5"
              role="tablist"
              aria-label="Rewards views"
            >
              {([
                { id: 'open', label: 'Open claims', count: openClaims.length },
                { id: 'history', label: 'Claim history', count: historyClaims.length },
                { id: 'catalog', label: 'Prize configuration', count: catalog.length },
              ] as const).map((tab) => {
                const active = view === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setView(tab.id);
                      setSearch('');
                    }}
                    className={`relative cursor-pointer whitespace-nowrap py-3.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/40 ${
                      active
                        ? 'text-[var(--primary)]'
                        : 'text-[var(--text-strong)]/45 hover:text-[var(--text-strong)]/70'
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tabular-nums ${
                        active
                          ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                          : 'bg-[var(--primary)]/5 text-[var(--text-strong)]/35'
                      }`}
                    >
                      {tab.count}
                    </span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--primary)]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pb-3 sm:pb-0">
              <div className="relative w-full sm:w-72">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-strong)]/35"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    view === 'catalog'
                      ? 'Search prizes…'
                      : 'Search claims, students, or codes…'
                  }
                  aria-label={
                    view === 'catalog'
                      ? 'Search prizes'
                      : 'Search claims, students, or codes'
                  }
                  className="h-9 w-full rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/50 pl-9 pr-8 text-xs font-medium text-[var(--text-strong)] outline-none transition-colors placeholder:text-[var(--text-strong)]/35 focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/15"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--text-strong)]/40 transition-colors hover:bg-[var(--primary)]/5 hover:text-[var(--text-strong)]/70"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                aria-label="Refresh rewards"
                title="Refresh"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--primary)]/10 bg-white text-[var(--text-strong)]/60 transition-colors hover:bg-[var(--primary)]/5 hover:text-[var(--text-strong)] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
              </button>
            </div>
          </div>

          {view === 'catalog' ? (
            <RewardCatalogTable
              rewards={filteredCatalog}
              busyId={busyId}
              onToggleActive={handleToggleActive}
              onUpdateStock={handleUpdateStock}
              onEdit={setEditingReward}
              emptyTitle={query ? 'No prizes match your search' : 'No rewards configured'}
              emptyDescription={
                query
                  ? 'Try a different prize name or code.'
                  : 'Run the reward seed to install placeholder tiers.'
              }
            />
          ) : (
            <RewardClaimQueue
              claims={view === 'open' ? filteredOpenClaims : filteredHistoryClaims}
              onReview={setReviewClaim}
              emptyTitle={
                query
                  ? 'No claims match your search'
                  : view === 'open'
                    ? 'No open claims'
                    : 'No claim history yet'
              }
              emptyDescription={
                query
                  ? 'Try a different student, prize, or claim code.'
                  : view === 'open'
                    ? 'New prize requests will appear here for release.'
                    : 'Released and cancelled claims will appear here.'
              }
            />
          )}
        </div>
      )}

      <RewardClaimReviewModal
        claim={reviewClaim}
        busy={busyId === reviewClaim?.id}
        onClose={() => setReviewClaim(null)}
        onRelease={handleRelease}
        onCancel={handleCancel}
      />

      <RewardEditModal
        reward={editingReward}
        onClose={() => setEditingReward(null)}
        onSubmit={handleSaveReward}
      />

      <ConfirmDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={confirmation?.title ?? ''}
        description={confirmation?.description}
        confirmLabel={confirmation?.confirmLabel ?? 'Confirm'}
        destructive={confirmation?.destructive}
        onConfirm={() => confirmation?.onConfirm()}
      />
    </div>
  );
};

