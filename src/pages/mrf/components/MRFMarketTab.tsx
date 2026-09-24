import React from 'react';
import {
  Scale,
  CheckCircle2,
  Clock,
  Coins,
} from 'lucide-react';
import { RECYCLABLE_CATEGORIES, ItemizedRecyclableCategory } from '../MRFDashboard';
import { MarketStockItem, SaleTransaction } from '../../../hooks/useRecycleMarket';

interface MRFMarketTabProps {
  stocksRecord: Record<string, MarketStockItem>;
  salesHistory: SaleTransaction[];
  totalVendorSales: number;
  handleSellBatch: (cat: ItemizedRecyclableCategory) => void;
}

export const MRFMarketTab: React.FC<MRFMarketTabProps> = ({
  stocksRecord,
  salesHistory,
  totalVendorSales,
  handleSellBatch,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Market Overview Header */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[var(--gold)]/15 text-[var(--gold)] flex items-center justify-center shrink-0">
            <Scale size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black text-[var(--gold)] bg-[var(--gold)]/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Market Inventory Ledger
            </span>
            <h3 className="text-xl font-heading font-black text-[var(--text-strong)] mt-1">Itemized Recycling Market & Selling Tracker</h3>
            <p className="text-xs text-[var(--text-strong)]/60">Track accumulated recyclable weights toward market selling limit thresholds.</p>
          </div>
        </div>
        <div className="bg-[var(--background)] p-3 rounded-2xl border border-[var(--primary)]/10 text-right shrink-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Vendor Revenue</span>
          <span className="text-xl font-heading font-black text-[var(--accent)]">
            ₱{totalVendorSales.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Grid of 4 Itemized Recyclable Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {RECYCLABLE_CATEGORIES.map(cat => {
          const stock = stocksRecord[cat.id];
          const currentKg = stock ? stock.accumulatedKg : 0;
          const thresholdKg = stock ? stock.thresholdLimitKg : cat.thresholdLimitKg;
          const pricePerKg = stock ? stock.marketPricePerKg : cat.marketPricePerKg;
          const isApproved = stock ? stock.isApprovedForSale === true : false;
          const isThresholdReached = currentKg >= thresholdKg;
          const pct = Math.min(100, Math.round((currentKg / thresholdKg) * 100));

          return (
            <div
              key={cat.id}
              className={`bg-white/95 backdrop-blur-md border rounded-3xl p-5 shadow-sm space-y-3 transition-all relative overflow-hidden ${
                isApproved
                  ? 'border-emerald-500 ring-2 ring-emerald-400/50 shadow-lg bg-emerald-50/20'
                  : isThresholdReached
                  ? 'border-amber-300 ring-2 ring-amber-400/40 shadow-md bg-amber-50/20'
                  : 'border-gray-200'
              }`}
            >
              {isApproved ? (
                <div className="bg-[var(--accent)] text-white font-black text-[9px] uppercase px-3 py-1 text-center font-mono tracking-wider -mx-5 -mt-5 mb-2 flex items-center justify-center gap-1.5 animate-pulse">
                  <CheckCircle2 size={12} /> APPROVED BY ADMIN — READY TO COMPLETE VENDOR SALE!
                </div>
              ) : isThresholdReached ? (
                <div className="bg-amber-400 text-amber-950 font-black text-[9px] uppercase px-3 py-1 text-center font-mono tracking-wider -mx-5 -mt-5 mb-2">
                  ⚠️ SELLING THRESHOLD REACHED — AWAITING ADMIN SALE APPROVAL
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-[var(--text-strong)]">{cat.name}</h4>
                  <p className="text-[11px] text-gray-400 font-medium">Market rate: ₱{pricePerKg} / kg</p>
                </div>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : isThresholdReached
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {currentKg.toFixed(1)} / {thresholdKg} kg
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-gray-400">Target Market Batch</span>
                  <span className={isApproved ? 'text-[var(--accent)] font-black' : isThresholdReached ? 'text-amber-700 font-black' : 'text-[var(--accent)]'}>{pct}% Full</span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isApproved ? 'bg-[var(--accent)]' : isThresholdReached ? 'bg-amber-400' : 'bg-[var(--accent)]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Action to Sell Batch */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500 font-medium">
                  Est. Batch Value: <strong className="text-[var(--text-strong)]">₱{Math.round(currentKg * pricePerKg).toLocaleString()}</strong>
                </span>

                {isApproved ? (
                  <button
                    type="button"
                    onClick={() => handleSellBatch(cat)}
                    className="px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 bg-[var(--gold)] hover:bg-[#b0881e] text-white shadow-md shadow-amber-500/20 animate-bounce"
                  >
                    <Coins size={15} /> Complete Vendor Sale
                  </button>
                ) : isThresholdReached ? (
                  <button
                    type="button"
                    disabled
                    className="px-3.5 py-2 rounded-xl text-[11px] font-extrabold bg-amber-100 border border-amber-300 text-amber-900 cursor-not-allowed flex items-center gap-1.5 opacity-90"
                  >
                    <Clock size={13} /> Awaiting Admin Approval
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-3.5 py-2 rounded-xl text-[11px] font-bold bg-gray-100 text-gray-400 cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Coins size={13} /> Awaiting Threshold
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sales Ledger History */}
      <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-heading font-bold text-[var(--text-strong)] flex items-center gap-2">
          <Coins size={16} className="text-[var(--gold)]" />
          <span>Recycling Market Vendor Sales Ledger</span>
        </h4>

        {salesHistory.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No recycling sales recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-150 text-xs">
            {salesHistory.map(sale => (
              <div key={sale.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[var(--text-strong)]">{sale.categoryName}</p>
                  <p className="text-[10px] text-gray-400">
                    {sale.buyerName} · {sale.soldAt}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-black text-[var(--accent)] block text-sm">₱{sale.totalRevenue.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-400 font-semibold">{sale.weightKg} kg batch sold</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
