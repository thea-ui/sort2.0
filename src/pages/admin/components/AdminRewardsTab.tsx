import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Gift, PackageCheck, Clock3, RefreshCw, Loader2 } from 'lucide-react';
import { apiService } from '../../../services/api';
import { Reward, RewardClaim } from '../../../types';
import { RewardClaimQueue } from './RewardClaimQueue';
import { RewardCatalogTable } from './RewardCatalogTable';

interface AdminRewardsTabProps {
  showToast: (msg: string) => void;
}

export const AdminRewardsTab: React.FC<AdminRewardsTabProps> = ({ showToast }) => {
  const [view, setView] = useState<'claims' | 'catalog'>('claims');
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [catalog, setCatalog] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleRelease = async (claim: RewardClaim) => {
    const label = claim.reward?.title || 'this prize';
    const confirmed = window.confirm(
      `Release "${label}" to ${claim.student?.name || 'this student'}?\n\nClaim code: ${claim.claimCode}\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setBusyId(claim.id);
    try {
      const result = await apiService.releaseRewardClaim(claim.id);
      showToast(
        result.pointsAwarded > 0
          ? `Released ${label} — +${result.pointsAwarded} pts credited to ${result.claim.student?.name}.`
          : `Released ${label} to ${result.claim.student?.name}.`
      );
      await refresh();
    } catch (err: any) {
      showToast(err?.message || 'Failed to release claim');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (claim: RewardClaim) => {
    const confirmed = window.confirm(
      `Cancel claim ${claim.claimCode} for ${claim.student?.name || 'this student'}?`
    );
    if (!confirmed) return;

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
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold text-[#C69B26] bg-[#C69B26]/10 border border-[#C69B26]/25 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Milestone Prizes
          </span>
          <h3 className="text-xl font-heading font-black text-[#00271D] tracking-tight mt-1.5 flex items-center gap-2">
            <Gift size={20} className="text-[#C69B26]" /> Rewards &amp; Prize Claims
          </h3>
          <p className="text-xs text-[#00271D]/50 mt-0.5">
            Release prizes unlocked by student bottle turn-ins. Points rewards credit automatically on release.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-[#00271D] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} className="text-[#00A77C]" />}
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Awaiting release', value: stats.awaiting, icon: Clock3, color: 'text-[#C69B26]', bg: 'bg-[#C69B26]/10' },
          { label: 'Released (loaded)', value: stats.released, icon: PackageCheck, color: 'text-[#00A77C]', bg: 'bg-[#00A77C]/10' },
          { label: 'Physical stock left', value: stats.stockLeft, icon: Gift, color: 'text-sky-600', bg: 'bg-sky-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/95 border border-white/80 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
              <stat.icon size={16} />
            </div>
            <div>
              <p className="text-lg font-heading font-black text-[#00271D] leading-none">{stat.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#00271D]/40 mt-1">{stat.label}</p>
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
                ? 'bg-[#00271D] text-white shadow-sm'
                : 'bg-white text-[#00271D]/60 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab === 'claims' ? `Claims Queue (${claims.length})` : `Prize Catalog (${catalog.length})`}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
          {error}
        </p>
      )}

      {loading && claims.length === 0 && catalog.length === 0 ? (
        <div className="bg-white/90 border border-white/80 rounded-3xl p-12 text-center">
          <Loader2 size={22} className="mx-auto text-[#00A77C] animate-spin" />
          <p className="text-xs text-[#00271D]/50 font-semibold mt-2">Loading rewards…</p>
        </div>
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
    </div>
  );
};
