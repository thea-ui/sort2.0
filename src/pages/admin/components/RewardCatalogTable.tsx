import React, { useState } from 'react';
import { Gift, Coins, Package, Save, Eye, EyeOff } from 'lucide-react';
import { Reward } from '../../../types';

interface RewardCatalogTableProps {
  rewards: Reward[];
  busyId: string | null;
  onToggleActive: (reward: Reward) => void;
  onUpdateStock: (reward: Reward, stock: number | null) => void;
}

export const RewardCatalogTable: React.FC<RewardCatalogTableProps> = ({
  rewards,
  busyId,
  onToggleActive,
  onUpdateStock,
}) => {
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});

  return (
    <div className="space-y-2.5">
      <div className="bg-[var(--gold)]/5 border border-[var(--gold)]/25 rounded-2xl px-4 py-3">
        <p className="text-[11px] font-bold text-[var(--text-strong)]/70">
          Placeholder prize tiers — replace titles, values, and stock after the student/professor interview.
          Changes apply to future unlocks only; existing claims keep their snapshot.
        </p>
      </div>

      {rewards.map((reward) => {
        const busy = busyId === reward.id;
        const isPhysical = reward.rewardType === 'PHYSICAL';
        const draft = stockDrafts[reward.id] ?? (reward.stock === null ? '' : String(reward.stock));

        return (
          <div
            key={reward.id}
            className={`bg-white/95 border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              reward.isActive === false ? 'border-gray-200 opacity-60' : 'border-white/80'
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isPhysical ? 'bg-[var(--gold)]/10 text-[var(--gold)]' : 'bg-[var(--accent)]/10 text-[var(--accent)]'
                }`}
              >
                {isPhysical ? <Package size={17} /> : <Coins size={17} />}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-extrabold text-[var(--text-strong)]">{reward.title}</p>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-500">
                    {reward.code}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-strong)]/50 font-semibold">{reward.description}</p>
                <p className="text-[10px] font-bold text-[var(--text-strong)]/40">
                  {(reward.requiredGrams / 1000).toFixed(0)} kg tier · {reward.claimsCount ?? 0} claim(s)
                  {!isPhysical && reward.pointsValue > 0 ? ` · +${reward.pointsValue} pts on release` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {isPhysical && (
                <>
                  <input
                    type="number"
                    min={0}
                    value={draft}
                    onChange={(e) => setStockDrafts((prev) => ({ ...prev, [reward.id]: e.target.value }))}
                    placeholder="∞"
                    className="w-20 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-[var(--text-strong)] outline-none focus:border-[var(--gold)]"
                    aria-label={`Stock for ${reward.title}`}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const raw = stockDrafts[reward.id];
                      const stock = raw === '' || raw === undefined ? null : Math.max(0, Math.floor(Number(raw)));
                      onUpdateStock(reward, stock);
                      setStockDrafts((prev) => {
                        const next = { ...prev };
                        delete next[reward.id];
                        return next;
                      });
                    }}
                    className="p-2 rounded-xl border border-gray-200 text-[var(--text-strong)] hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                    aria-label={`Save stock for ${reward.title}`}
                  >
                    <Save size={14} />
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => onToggleActive(reward)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-extrabold border transition-colors disabled:opacity-50 cursor-pointer ${
                  reward.isActive === false
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                }`}
              >
                {reward.isActive === false ? <Eye size={13} /> : <EyeOff size={13} />}
                {reward.isActive === false ? 'Enable' : 'Disable'}
              </button>
            </div>
          </div>
        );
      })}

      {rewards.length === 0 && (
        <div className="bg-white/90 border border-white/80 rounded-3xl p-12 text-center space-y-2">
          <Gift size={22} className="mx-auto text-[var(--gold)]" />
          <p className="text-sm font-bold text-[var(--text-strong)]">No rewards configured</p>
          <p className="text-xs text-[var(--text-strong)]/50">Run the reward seed to install placeholder tiers.</p>
        </div>
      )}
    </div>
  );
};
