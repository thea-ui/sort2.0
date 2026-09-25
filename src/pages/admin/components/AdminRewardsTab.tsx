import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Gift, PackageCheck, Clock3, RefreshCw, Loader2 } from 'lucide-react';
import { apiService } from '../../../services/api';
import { Reward, RewardClaim } from '../../../types';
import { RewardClaimQueue } from './RewardClaimQueue';
import { RewardCatalogTable } from './RewardCatalogTable';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { LoadingState } from '../../../components/common/LoadingState';
import { PageHeader } from '../../../components/layout/PageHeader';

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
  const [view, setView] = useState<'claims' | 'catalog'>('claims');
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [catalog, setCatalog] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);

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
    } catch (err: any) {
      showToast(err?.message || 'Failed to release claim');
    } finally {
      setBusyId(null);
    }
  };

  const handleRelease = (claim: RewardClaim) => {
    const label = claim.reward?.title || 'this prize';
    setConfirmation({
      title: 'Release prize?',
      description: `Release "${label}" to ${
        claim.student?.name || 'this student'
      }? Claim code: ${claim.claimCode}. This cannot be undone.`,
      confirmLabel: 'Release',
      onConfirm: () => {
        setConfirmation(null);
        void releaseClaim(claim, label);
      },
    });
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
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Rewards & Prize Claims"
        description="Release prizes unlocked by student bottle turn-ins. Points rewards credit automatically on release."
        actions={
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-[var(--primary)]/10 hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)] text-[var(--text-strong)] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} className="text-[var(--accent)]" />
            )}
            Refresh
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Awaiting release',
            value: stats.awaiting,
            icon: Clock3,
            color: 'text-[var(--gold)]',
            bg: 'bg-[color-mix(in_srgb,var(--gold)_10%,white)]',
          },
          {
            label: 'Released (loaded)',
            value: stats.released,
            icon: PackageCheck,
            color: 'text-[var(--accent)]',
            bg: 'bg-[color-mix(in_srgb,var(--accent)_10%,white)]',
          },
          {
            label: 'Physical stock left',
            value: stats.stockLeft,
            icon: Gift,
            color: 'text-[var(--text-strong)]',
            bg: 'bg-[color-mix(in_srgb,var(--primary)_10%,white)]',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-sm flex items-center gap-3"
          >
            <div className={`h-9 w-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
              <stat.icon size={16} />
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-strong)] leading-none">{stat.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/40 mt-1">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        {(['claims', 'catalog'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setView(tab)}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
              view === tab
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'bg-white text-[var(--text-strong)]/60 border border-[var(--primary)]/10 hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)]'
            }`}
          >
            {tab === 'claims' ? `Claims Queue (${claims.length})` : `Prize Catalog (${catalog.length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-100 cursor-pointer transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading && claims.length === 0 && catalog.length === 0 ? (
        <LoadingState label="Loading rewards…" />
      ) : view === 'claims' ? (
        <RewardClaimQueue
          claims={claims}
          busyId={busyId}
          onRelease={handleRelease}
          onCancel={handleCancel}
        />
      ) : (
        <RewardCatalogTable
          rewards={catalog}
          busyId={busyId}
          onToggleActive={handleToggleActive}
          onUpdateStock={handleUpdateStock}
        />
      )}

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
