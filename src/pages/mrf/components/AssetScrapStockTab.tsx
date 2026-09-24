import React, { useEffect, useState } from 'react';
import { Scale, CheckCircle2, Clock, Coins, ShieldAlert, Loader2, PackageCheck, Plus, Trash2, Inbox } from 'lucide-react';
import { useAssetScrap, type ScrapItem } from '../../../hooks/useAssetScrap';
import { useMockData } from '../../../hooks/useMockData';
import { AssetScrapWeighedHistory } from './AssetScrapWeighedHistory';

interface AssetScrapStockTabProps {
  showToast: (msg: string) => void;
}

const NEW_ENTRY = '__new__';

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

  const handleSell = async (materialCode: string, materialName: string, accumulatedKg: number, thresholdKg: number) => {
    const sellKg = Math.min(accumulatedKg, thresholdKg);
    if (!window.confirm(`Sell ${sellKg.toFixed(1)} kg of ${materialName} as scrap?`)) return;
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

  const handleDispose = async (item: ScrapItem) => {
    const reference = window.prompt(
      `Dispose "${item.description || item.materialName}" via an accredited handler.\nEnter disposal reference (WMR / DENR receipt no.):`,
      ''
    );
    if (reference === null) return;
    setBusy(item.id);
    try {
      await disposeScrapItem(item.id, reference.trim() || undefined);
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
          <div className="h-12 w-12 rounded-2xl bg-[var(--primary)]/15 text-[var(--text-strong)] flex items-center justify-center shrink-0">
            <Scale size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black text-[var(--text-strong)] bg-[var(--primary)]/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Asset Scrap Recovery Stock
            </span>
            <h3 className="text-xl font-heading font-black text-[var(--text-strong)] mt-1">Unserviceable Asset Scrap & Junk Sale Tracker</h3>
            <p className="text-xs text-[var(--text-strong)]/60">Weigh unserviceable assets, store at the MRF, and sell each material once the threshold is reached.</p>
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

      {/* Material cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {materials.map((mat) => {
          const currentKg = mat.accumulatedKg || 0;
          const thresholdKg = mat.thresholdLimitKg || 1;
          const isApproved = mat.isApprovedForSale === true;
          const isThresholdReached = currentKg >= thresholdKg;
          const pct = Math.min(100, Math.round((currentKg / thresholdKg) * 100));
          const hazmat = mat.hazmat === true;

          return (
            <div
              key={mat.materialCode}
              className={`bg-white/95 backdrop-blur-md border rounded-3xl p-5 shadow-sm space-y-3 transition-all relative overflow-hidden ${
                isApproved ? 'border-emerald-500 ring-2 ring-emerald-400/50 shadow-lg bg-emerald-50/20'
                : isThresholdReached ? 'border-amber-300 ring-2 ring-amber-400/40 shadow-md bg-amber-50/20'
                : 'border-gray-200'
              }`}
            >
              {hazmat ? (
                <div className="bg-rose-500 text-white font-black text-[9px] uppercase px-3 py-1 text-center tracking-wider -mx-5 -mt-5 mb-2 flex items-center justify-center gap-1.5">
                  <ShieldAlert size={12} /> HAZARDOUS — ACCREDITED HANDLER ONLY (NOT SOLD AS JUNK)
                </div>
              ) : isApproved ? (
                <div className="bg-[var(--accent)] text-white font-black text-[9px] uppercase px-3 py-1 text-center tracking-wider -mx-5 -mt-5 mb-2 flex items-center justify-center gap-1.5 animate-pulse">
                  <CheckCircle2 size={12} /> APPROVED — READY FOR SCRAP SALE
                </div>
              ) : isThresholdReached ? (
                <div className="bg-amber-400 text-amber-950 font-black text-[9px] uppercase px-3 py-1 text-center tracking-wider -mx-5 -mt-5 mb-2">
                  THRESHOLD REACHED — AWAITING DISPOSAL COMMITTEE APPROVAL
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold text-[var(--text-strong)] truncate">{mat.materialName}</h4>
                  <p className="text-[11px] text-gray-400 font-medium">Est. rate: ₱{mat.marketPricePerKg} / kg</p>
                </div>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${
                  isApproved ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : isThresholdReached ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-gray-100 text-gray-700'
                }`}>
                  {currentKg.toFixed(1)} / {thresholdKg} kg
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-gray-400">Scrap Batch Target</span>
                  <span className={isApproved ? 'text-[var(--accent)] font-black' : isThresholdReached ? 'text-amber-700 font-black' : 'text-[var(--accent)]'}>{pct}%</span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isApproved ? 'bg-[var(--accent)]' : isThresholdReached ? 'bg-amber-400' : 'bg-[var(--primary)]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-gray-500 font-medium truncate">
                  Est. value: <strong className="text-[var(--text-strong)]">₱{Math.round(currentKg * mat.marketPricePerKg).toLocaleString()}</strong>
                </span>

                {hazmat ? (
                  <span className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-1.5 shrink-0">
                    <ShieldAlert size={12} /> Handler disposal
                  </span>
                ) : isApproved ? (
                  <button
                    type="button"
                    onClick={() => handleSell(mat.materialCode, mat.materialName, currentKg, thresholdKg)}
                    disabled={busy === mat.materialCode}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-[var(--gold)] hover:bg-[#b0881e] text-white shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {busy === mat.materialCode ? <Loader2 size={14} className="animate-spin" /> : <Coins size={14} />} Sell Scrap
                  </button>
                ) : isThresholdReached ? (
                  isAdmin ? (
                    <button
                      type="button"
                      onClick={() => { setApproveFor(mat.materialCode); setApprovalRef(''); }}
                      className="px-3.5 py-2 rounded-xl text-[11px] font-extrabold bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <CheckCircle2 size={13} /> Approve Sale
                    </button>
                  ) : (
                    <span className="px-3.5 py-2 rounded-xl text-[11px] font-extrabold bg-amber-100 border border-amber-300 text-amber-900 flex items-center gap-1.5 shrink-0">
                      <Clock size={13} /> Awaiting approval
                    </span>
                  )
                ) : (
                  <span className="px-3.5 py-2 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-400 flex items-center gap-1.5 shrink-0">
                    <Coins size={13} /> Below threshold
                  </span>
                )}
              </div>
            </div>
          );
        })}
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
    </div>
  );
};
