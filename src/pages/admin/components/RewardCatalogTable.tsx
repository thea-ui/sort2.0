import React, { useState } from 'react';
import { Coins, Eye, EyeOff, Gift, Info, Package, Pencil, Save } from 'lucide-react';
import { Reward } from '../../../types';

interface RewardCatalogTableProps {
  rewards: Reward[];
  busyId: string | null;
  onToggleActive: (reward: Reward) => void;
  onUpdateStock: (reward: Reward, stock: number | null) => void;
  onEdit: (reward: Reward) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const RewardCatalogTable: React.FC<RewardCatalogTableProps> = ({
  rewards,
  busyId,
  onToggleActive,
  onUpdateStock,
  onEdit,
  emptyTitle = 'No rewards configured',
  emptyDescription = 'Run the reward seed to install placeholder tiers.',
}) => {
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});

  return (
    <div>
      <div className="flex items-start gap-2 border-b border-[var(--gold)]/20 bg-[var(--gold)]/[0.04] px-4 py-2.5 text-[11px] font-medium leading-relaxed text-[var(--text-strong)]/60 sm:px-5">
        <Info size={13} className="mt-0.5 shrink-0 text-[var(--gold-strong)]" />
        <p>
          Placeholder prize tiers — changes apply to future unlocks only; existing claims keep their
          snapshot.
        </p>
      </div>

      {rewards.length === 0 ? (
        <div className="space-y-2 px-6 py-12 text-center">
          <Gift size={22} className="mx-auto text-[var(--gold-strong)]" />
          <p className="text-sm font-bold text-[var(--text-strong)]">{emptyTitle}</p>
          <p className="text-xs text-[var(--text-strong)]/50">{emptyDescription}</p>
        </div>
      ) : (
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="border-b border-[var(--primary)]/10">
              <th
                scope="col"
                className="px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-strong)]/35 sm:px-5 xl:w-[38%]"
              >
                Prize
              </th>
              <th
                scope="col"
                className="hidden w-20 px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-strong)]/35 sm:table-cell xl:w-[9%]"
              >
                Tier
              </th>
              <th
                scope="col"
                className="hidden w-28 px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-strong)]/35 md:table-cell xl:w-[10%]"
              >
                Reward
              </th>
              <th
                scope="col"
                className="hidden w-20 px-3 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-strong)]/35 xl:table-cell xl:w-[8%]"
              >
                Claims
              </th>
              <th
                scope="col"
                className="hidden w-36 px-3 py-2.5 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-strong)]/35 sm:table-cell xl:w-[15%]"
              >
                Stock
              </th>
              <th
                scope="col"
                className="w-24 px-3 py-2.5 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-strong)]/35 xl:w-[10%]"
              >
                Status
              </th>
              <th scope="col" className="w-24 px-4 py-2.5 sm:px-5 xl:w-[10%]">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--primary)]/10">
            {rewards.map((reward) => {
              const busy = busyId === reward.id;
              const isPhysical = reward.rewardType === 'PHYSICAL';
              const isActive = reward.isActive !== false;
              const draft =
                stockDrafts[reward.id] ?? (reward.stock === null ? '' : String(reward.stock));

              return (
                <tr
                  key={reward.id}
                  className={`transition-colors hover:bg-[var(--accent)]/[0.03] ${
                    isActive ? '' : 'bg-[var(--primary)]/[0.015]'
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
                          {reward.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--text-strong)]/50">
                          {reward.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="hidden px-3 py-3 text-[11px] font-semibold text-[var(--text-strong)]/70 sm:table-cell">
                    {Math.round(reward.requiredGrams / 1000)} kg
                  </td>

                  <td className="hidden px-3 py-3 text-[11px] font-semibold md:table-cell">
                    {isPhysical ? (
                      <span className="text-[var(--text-strong)]/55">Physical</span>
                    ) : (
                      <span className="text-[var(--accent)]">+{reward.pointsValue} pts</span>
                    )}
                  </td>

                  <td className="hidden px-3 py-3 text-center text-[11px] font-semibold text-[var(--text-strong)]/60 tabular-nums xl:table-cell">
                    {reward.claimsCount ?? 0}
                  </td>

                  <td className="hidden px-3 py-3 sm:table-cell">
                    {isPhysical ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={draft}
                          disabled={busy}
                          onChange={(event) =>
                            setStockDrafts((prev) => ({
                              ...prev,
                              [reward.id]: event.target.value,
                            }))
                          }
                          placeholder="∞"
                          aria-label={`Stock for ${reward.title}`}
                          className="h-8 w-16 rounded-lg border border-[var(--primary)]/10 bg-white px-2 text-xs font-semibold text-[var(--text-strong)] outline-none transition-colors focus:border-[var(--gold)]/50 disabled:opacity-50"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            const raw = stockDrafts[reward.id];
                            const stock =
                              raw === '' || raw === undefined
                                ? null
                                : Math.max(0, Math.floor(Number(raw)));
                            onUpdateStock(reward, stock);
                            setStockDrafts((prev) => {
                              const next = { ...prev };
                              delete next[reward.id];
                              return next;
                            });
                          }}
                          aria-label={`Save stock for ${reward.title}`}
                          title="Save stock"
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--primary)]/10 bg-white text-[var(--text-strong)]/55 transition-colors hover:bg-[var(--primary)]/5 hover:text-[var(--text-strong)] disabled:opacity-50"
                        >
                          <Save size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[var(--text-strong)]/30">—</span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                        isActive
                          ? 'border-[var(--success)]/25 bg-[var(--success)]/10 text-[var(--success-strong)]'
                          : 'border-[var(--primary)]/10 bg-[var(--primary)]/5 text-[var(--text-strong)]/40'
                      }`}
                    >
                      {isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right sm:px-5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onEdit(reward)}
                        aria-label={`Edit ${reward.title}`}
                        title="Edit prize"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--primary)]/10 bg-white text-[var(--text-strong)]/55 transition-colors hover:bg-[var(--primary)]/5 hover:text-[var(--text-strong)] disabled:opacity-50"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onToggleActive(reward)}
                        aria-label={`${isActive ? 'Disable' : 'Enable'} ${reward.title}`}
                        title={isActive ? 'Disable prize' : 'Enable prize'}
                        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-white transition-colors disabled:opacity-50 ${
                          isActive
                            ? 'border-[var(--primary)]/10 text-[var(--text-strong)]/45 hover:bg-[var(--primary)]/5 hover:text-[var(--text-strong)]'
                            : 'border-[var(--success)]/25 text-[var(--success-strong)] hover:bg-[var(--success)]/10'
                        }`}
                      >
                        {isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

