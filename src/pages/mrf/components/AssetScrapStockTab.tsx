import React, { useEffect, useState } from 'react';
import { AlertTriangle, Scale, CheckCircle2, ChevronDown, Clock, Coins, ShieldAlert, Loader2, PackageCheck, Plus, Trash2, Inbox } from 'lucide-react';
import { useAssetScrap, type ScrapItem } from '../../../hooks/useAssetScrap';
import { generateScrapApprovalReference } from '../../../utils/scrapReference';
import { FALLBACK_SCRAP_META, SCRAP_MATERIAL_META } from '../../../utils/materialMeta';
import { useMockData } from '../../../hooks/useMockData';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { AssetScrapWeighedHistory } from './AssetScrapWeighedHistory';

interface AssetScrapStockTabProps {
  showToast: (msg: string) => void;
}

const NEW_ENTRY = '__new__';

const ROW_SHELL = 'overflow-hidden rounded-2xl border bg-white transition-colors';
const PANEL = 'border-t border-[var(--primary)]/5 px-4 pb-4 pt-4';
const MICRO_LABEL =
  'block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-strong)]/40';
const NUMBER = 'font-mono font-bold tabular-nums';
const SUCCESS_CHIP =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--success)]/25 bg-[var(--success)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--success-strong)]';
const WARNING_CHIP =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--warning)]/25 bg-[var(--warning)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--warning-strong)]';
const DANGER_CHIP =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--danger)]/25 bg-[var(--danger)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--danger-strong)]';
const PRIMARY_BUTTON =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-[11px] font-bold text-white shadow-sm shadow-[var(--accent)]/25 transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-50';

function formatLogged(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const AssetScrapStockTab: React.FC<AssetScrapStockTabProps> = ({ showToast }) => {
  const { currentUser } = useMockData();
  const {
    materials,
    salesHistory,
    totalScrapSales,
    pendingItems,
    weighedItems,
    approveSale,
    sellBatch,
    createScrapItem,
    weighScrapItem,
    disposeScrapItem,
  } = useAssetScrap();
  const [busy, setBusy] = useState<string | null>(null);
  const [approveFor, setApproveFor] = useState<string | null>(null);
  const [approvalRef, setApprovalRef] = useState('');
  const [showWeigh, setShowWeigh] = useState(false);
  const [weighTarget, setWeighTarget] = useState<string>(NEW_ENTRY);
  const [weighMaterial, setWeighMaterial] = useState('ferrous_metal');
  const [weighKg, setWeighKg] = useState('');
  const [weighing, setWeighing] = useState(false);
  // Destructive flows run through ConfirmDialog — never window.confirm/prompt.
  const [sellTarget, setSellTarget] = useState<{ code: string; name: string; kg: number } | null>(null);
  const [disposeTarget, setDisposeTarget] = useState<ScrapItem | null>(null);
  const [disposeRef, setDisposeRef] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const openWeigh = (targetId: string = NEW_ENTRY) => {
    setWeighTarget(targetId);
    setWeighKg('');
    setShowWeigh(true);
  };

  useEffect(() => {
    if (showWeigh && weighTarget !== NEW_ENTRY) {
      const target = pendingItems.find((it) => it.id === weighTarget);
      if (target) setWeighMaterial(target.materialCode);
    }
  }, [showWeigh, weighTarget, pendingItems]);

  const handleSell = (materialCode: string, materialName: string, accumulatedKg: number, thresholdKg: number) => {
    setSellTarget({ code: materialCode, name: materialName, kg: Math.min(accumulatedKg, thresholdKg) });
  };

  const confirmSell = async () => {
    if (!sellTarget) return;
    const { code: materialCode, name: materialName } = sellTarget;
    setSellTarget(null);
    setBusy(materialCode);
    try {
      const tx = await sellBatch(materialCode);
      if (tx) {
        showToast(`Sold ${tx.weightKg} kg of ${materialName} for ₱${tx.totalRevenue.toLocaleString()}`);
      } else {
        showToast(`Batch sale could not be completed for ${materialName}.`);
      }
    } catch (err: any) {
      showToast(`Sale failed: ${err.message}`);
    } finally {
      setBusy(null);
    }
  };

  const handleConfirmApprove = async () => {
    if (!approveFor) return;
    setBusy(approveFor);
    try {
      await approveSale(approveFor, true, approvalRef.trim() || undefined);
      showToast('Scrap batch approved for sale (Disposal Committee).');
      setApproveFor(null);
      setApprovalRef('');
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`);
    } finally {
      setBusy(null);
    }
  };

  const handleWeighSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kg = parseFloat(weighKg) || 0;
    if (kg <= 0) return;
    setWeighing(true);
    try {
      if (weighTarget === NEW_ENTRY) {
        await createScrapItem({ materialCode: weighMaterial, weightKg: kg, status: 'IN_STOCK' });
        const name = materials.find((m) => m.materialCode === weighMaterial)?.materialName || weighMaterial;
        showToast(`Weighed ${kg} kg of ${name} into scrap stock.`);
      } else {
        const item = pendingItems.find((it) => it.id === weighTarget);
        await weighScrapItem(weighTarget, kg);
        showToast(`Weighed ${kg} kg of ${item?.materialName || 'scrap'} into stock.`);
      }
      setShowWeigh(false);
      setWeighKg('');
    } catch (err: any) {
      showToast(`Failed to record scrap: ${err.message}`);
    } finally {
      setWeighing(false);
    }
  };

  const handleDispose = (item: ScrapItem) => {
    setDisposeRef('');
    setDisposeTarget(item);
  };

  const confirmDispose = async () => {
    if (!disposeTarget) return;
    const item = disposeTarget;
    const reference = disposeRef.trim() || undefined;
    setDisposeTarget(null);
    setBusy(item.id);
    try {
      await disposeScrapItem(item.id, reference);
      showToast(`Marked ${item.materialName} as disposed.`);
    } catch (err: any) {
      showToast(`Disposal failed: ${err.message}`);
    } finally {
      setBusy(null);
    }
  };

  const selectedPending = weighTarget !== NEW_ENTRY ? pendingItems.find((it) => it.id === weighTarget) : undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[color-mix(in_srgb,var(--primary)_15%,white)] text-[var(--text-strong)] flex items-center justify-center shrink-0">
            <Scale size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black text-[var(--text-strong)] bg-[color-mix(in_srgb,var(--primary)_15%,white)] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Asset Scrap Recovery Stock
            </span>
            <p className="text-xs text-[var(--text-strong)]/60 mt-1">Weigh unserviceable assets, store at the MRF, and sell each material once the threshold is reached.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => openWeigh(NEW_ENTRY)}
            className="px-4 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus size={14} /> Weigh Scrap
          </button>
          <div className="bg-[var(--background)] p-3 rounded-2xl border border-[var(--primary)]/10 text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Scrap Revenue</span>
            <span className="text-xl font-heading font-black text-[var(--accent)]">₱{totalScrapSales.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Unweighed queue */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-heading font-bold text-[var(--text-strong)] flex items-center gap-2">
            <Inbox size={16} className="text-[var(--text-strong)]" />
            <span>Awaiting Weighing</span>
          </h4>
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
            pendingItems.length > 0 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}>
            {pendingItems.length} unweighed
          </span>
        </div>

        {pendingItems.length === 0 ? (
          <div className="text-center py-5 space-y-2">
            <CheckCircle2 size={22} className="mx-auto text-emerald-400" />
            <p className="text-xs text-gray-400">No unweighed scrap. Every logged item has a weight.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 text-xs">
            {pendingItems.map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[var(--text-strong)] truncate">{item.description || item.materialName}</p>
                  <p className="text-[10px] text-gray-400">
                    {item.materialName}
                    {item.sourceAssetId ? ' · from asset ledger' : ''}
                    {item.createdAt ? ` · logged ${formatLogged(item.createdAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openWeigh(item.id)}
                    disabled={busy === item.id}
                    className="px-3.5 py-2 rounded-xl text-[11px] font-extrabold bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Scale size={13} /> Weigh
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDispose(item)}
                    disabled={busy === item.id}
                    className="px-3 py-2 rounded-xl text-[11px] font-bold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {busy === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Dispose
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Material folders */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-heading font-bold text-[var(--text-strong)] flex items-center gap-2">
          <Scale size={16} className="text-[var(--accent)]" />
          <span>Scrap Material Batches</span>
        </h4>

        <div className="space-y-3">
          {materials.map((mat) => {
            const meta = SCRAP_MATERIAL_META[mat.materialCode] || FALLBACK_SCRAP_META;
            const MaterialIcon = meta.icon;
            const currentKg = mat.accumulatedKg || 0;
            const thresholdKg = mat.thresholdLimitKg || 1;
            const isApproved = mat.isApprovedForSale === true;
            const isThresholdReached = currentKg >= thresholdKg;
            const hazmat = mat.hazmat === true;
            const awaitingApproval = isThresholdReached && !isApproved && !hazmat;
            const pct = Math.min(100, Math.round((currentKg / thresholdKg) * 100));
            const remainingKg = Math.max(0, thresholdKg - currentKg);
            const isOpen = openKey === mat.materialCode;
            const panelId = `scrap-stock-folder-${mat.materialCode}`;

            return (
              <div
                key={mat.materialCode}
                className={`${ROW_SHELL} ${
                  hazmat
                    ? 'border-[var(--danger)]/30'
                    : isApproved
                      ? 'border-[var(--success)]/40'
                      : awaitingApproval && isAdmin
                        ? 'border-[var(--warning)]/40'
                        : 'border-[var(--primary)]/10 hover:border-[var(--primary)]/20'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenKey(isOpen ? null : mat.materialCode)}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bgColor} ${meta.color}`}
                  >
                    <MaterialIcon size={17} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-strong)]">
                    {mat.materialName}
                  </span>
                  <span className="flex shrink-0 items-center gap-2.5">
                    {hazmat ? (
                      <span className={DANGER_CHIP}>
                        <ShieldAlert size={11} /> Handler disposal
                      </span>
                    ) : isApproved ? (
                      <span className={SUCCESS_CHIP}>
                        <CheckCircle2 size={11} /> Ready to sell
                      </span>
                    ) : awaitingApproval ? (
                      isAdmin ? (
                        <span className={WARNING_CHIP}>
                          <AlertTriangle size={11} /> Ready to sell
                        </span>
                      ) : (
                        <span className={WARNING_CHIP}>
                          <Clock size={11} /> Awaiting approval
                        </span>
                      )
                    ) : (
                      <span className="hidden sm:inline font-mono text-[11px] font-semibold tabular-nums text-[var(--text-strong)]/35">
                        {remainingKg.toFixed(1)} kg to go
                      </span>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-[var(--text-strong)]/35 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </span>
                </button>

                {isOpen && (
                  <div id={panelId} className={PANEL}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <span className={MICRO_LABEL}>Batch stock</span>
                        <p className="mt-1 text-sm">
                          <span className={`${NUMBER} text-[var(--text-strong)]`}>
                            {currentKg.toFixed(1)}
                          </span>
                          <span className="text-[var(--text-strong)]/35">
                            {' '}
                            / {thresholdKg} kg threshold
                          </span>
                        </p>
                        <div className="mt-2 flex items-center gap-2.5">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,white)]">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                awaitingApproval ? 'bg-[var(--warning)]' : meta.barColor
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`${NUMBER} text-[11px] text-[var(--text-strong)]/70`}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className={MICRO_LABEL}>Est. rate</span>
                        <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                          <span className={NUMBER}>₱{mat.marketPricePerKg}</span>
                          <span className="font-medium text-[var(--text-strong)]/40"> / kg</span>
                        </p>
                      </div>
                      <div>
                        <span className={MICRO_LABEL}>Est. value</span>
                        <p className={`mt-1 text-sm ${NUMBER} text-[var(--text-strong)]`}>
                          ₱{Math.round(currentKg * mat.marketPricePerKg).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--primary)]/5 pt-3">
                      {hazmat ? (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--danger-strong)]">
                          <ShieldAlert size={12} /> E-waste — accredited handler disposal only, not
                          sold as junk.
                        </span>
                      ) : isApproved ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleSell(mat.materialCode, mat.materialName, currentKg, thresholdKg)
                          }
                          disabled={busy === mat.materialCode}
                          className={PRIMARY_BUTTON}
                        >
                          {busy === mat.materialCode ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Coins size={13} />
                          )}{' '}
                          Sell Scrap
                        </button>
                      ) : awaitingApproval ? (
                        isAdmin ? (
                          <button
                            type="button"
                            onClick={() => {
                              setApproveFor(mat.materialCode);
                              setApprovalRef(
                                generateScrapApprovalReference([...materials, ...salesHistory]),
                              );
                            }}
                            className={PRIMARY_BUTTON}
                          >
                            <CheckCircle2 size={13} /> Approve Sale
                          </button>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-strong)]/45">
                            <Clock size={12} /> Awaiting the Disposal Committee approval reference
                            before this batch can be sold.
                          </span>
                        )
                      ) : (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-strong)]/45">
                          <Clock size={12} /> {remainingKg.toFixed(1)} kg to go before this batch
                          reaches the recovery threshold.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Weighed history */}
      <AssetScrapWeighedHistory items={weighedItems} />

      {/* Sales ledger */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-heading font-bold text-[var(--text-strong)] flex items-center gap-2">
          <Coins size={16} className="text-[var(--gold)]" />
          <span>Asset Scrap / Junk Sales Ledger</span>
        </h4>

        {salesHistory.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <PackageCheck size={22} className="mx-auto text-gray-300" />
            <p className="text-xs text-gray-400">No scrap sales recorded yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 text-xs">
            {salesHistory.map((sale) => (
              <div key={sale.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[var(--text-strong)] truncate">{sale.materialName}</p>
                  <p className="text-[10px] text-gray-400">
                    {sale.buyerName} · {sale.soldAt}
                    {sale.approvalReference ? ` · Ref: ${sale.approvalReference}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-[var(--accent)] block text-sm">₱{sale.totalRevenue.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-400 font-semibold">{sale.weightKg} kg sold</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve modal */}
      {approveFor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setApproveFor(null); }}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] px-6 py-4">
              <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Disposal Committee Approval</span>
              <h3 className="text-base font-bold text-white">Approve Scrap Batch Sale</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-[var(--text-strong)]/70">
                Record the approval reference (WMR / IIRUP / PTR / Disposal Committee minutes) before the batch can be sold.
              </p>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Approval Reference</label>
                <input
                  type="text"
                  value={approvalRef}
                  onChange={(e) => setApprovalRef(e.target.value)}
                  placeholder="e.g. WMR-2026-014"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setApproveFor(null)} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 cursor-pointer">Cancel</button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={busy === approveFor}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {busy === approveFor ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weigh Scrap modal */}
      {showWeigh && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowWeigh(false); }}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] px-6 py-4">
              <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Scrap Recovery</span>
              <h3 className="text-base font-bold text-white">Weigh Scrap</h3>
            </div>
            <form onSubmit={handleWeighSubmit} className="p-6 space-y-4">
              <p className="text-xs text-[var(--text-strong)]/70">
                {selectedPending
                  ? 'Record the weight of this logged item. It is added to that material\'s scrap stock.'
                  : 'Record the weight of an unserviceable item brought to the MRF. It is added to that material\'s scrap stock.'}
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Item</label>
                <select
                  value={weighTarget}
                  onChange={(e) => setWeighTarget(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-[var(--accent)] cursor-pointer"
                >
                  <option value={NEW_ENTRY}>New weighed entry…</option>
                  {pendingItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.description || item.materialName} ({item.materialName})
                    </option>
                  ))}
                </select>
              </div>

              {weighTarget === NEW_ENTRY && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Material *</label>
                  <select
                    value={weighMaterial}
                    onChange={(e) => setWeighMaterial(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-[var(--accent)] cursor-pointer"
                  >
                    {materials.map((m) => (
                      <option key={m.materialCode} value={m.materialCode}>{m.materialName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Weight (kg) *</label>
                <input
                  type="number" step="0.1" min="0.1" required autoFocus
                  value={weighKg}
                  onChange={(e) => setWeighKg(e.target.value)}
                  placeholder="0.0"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowWeigh(false)} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 cursor-pointer">Cancel</button>
                <button
                  type="submit"
                  disabled={weighing}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {weighing ? <Loader2 size={13} className="animate-spin" /> : <Scale size={13} />} Add to Scrap Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Junk-sale confirmation (destructive: disposes of the batch) */}
      <ConfirmDialog
        open={sellTarget !== null}
        onOpenChange={(open) => !open && setSellTarget(null)}
        title="Sell scrap batch"
        description={
          sellTarget
            ? `Sell ${sellTarget.kg.toFixed(1)} kg of ${sellTarget.name} as scrap? This disposes of the accumulated batch.`
            : undefined
        }
        confirmLabel="Sell batch"
        destructive
        loading={sellTarget !== null && busy === sellTarget.code}
        onConfirm={confirmSell}
      />

      {/* Disposal reference (replaces the legacy window.prompt) */}
      <ConfirmDialog
        open={disposeTarget !== null}
        onOpenChange={(open) => !open && setDisposeTarget(null)}
        title="Dispose scrap item"
        description={
          disposeTarget
            ? `Dispose "${disposeTarget.description || disposeTarget.materialName}" via an accredited handler.`
            : undefined
        }
        confirmLabel="Mark disposed"
        destructive
        loading={disposeTarget !== null && busy === disposeTarget.id}
        onConfirm={confirmDispose}
      >
        <div className="space-y-1.5">
          <label
            htmlFor="disposal-reference"
            className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block"
          >
            Disposal reference (WMR / DENR receipt no.)
          </label>
          <Input
            id="disposal-reference"
            value={disposeRef}
            onChange={(event) => setDisposeRef(event.target.value)}
            placeholder="Optional"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
};
