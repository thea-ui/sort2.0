import React from 'react';
import { Scale } from 'lucide-react';
import { computeCollectionTotals } from '../../../utils/collectionTotals';

export interface CollectionCategoryMeta {
  id: string;
  shortName: string;
  color: string;
  bgLight: string;
  borderColor: string;
}

interface CollectedItemsInputProps {
  categories: CollectionCategoryMeta[];
  itemWeights: Record<string, string>;
  onWeightChange: (categoryId: string, value: string) => void;
  otherName: string;
  onOtherNameChange: (value: string) => void;
  otherKg: string;
  onOtherKgChange: (value: string) => void;
}

export const CollectedItemsInput: React.FC<CollectedItemsInputProps> = ({
  categories,
  itemWeights,
  onWeightChange,
  otherName,
  onOtherNameChange,
  otherKg,
  onOtherKgChange,
}) => {
  const { totalWeight, filledCount } = computeCollectionTotals(itemWeights, otherKg);
  const otherValue = parseFloat(otherKg) || 0;
  const isOtherFilled = otherValue > 0;
  const totalTiles = categories.length + 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[color-mix(in_srgb,var(--accent)_10%,white)] flex items-center justify-center">
            <Scale size={14} className="text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-strong)]">Log Collected Items</p>
            <p className="text-[10px] text-gray-400 font-medium">Weigh each recyclable type in kg</p>
          </div>
        </div>
        {totalWeight > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,white)] ring-1 ring-[var(--accent)]/20">
            <span className="text-[11px] font-bold text-[var(--accent)]">{totalWeight.toFixed(1)} kg</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-1">
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#10B981] transition-all duration-500"
            style={{ width: `${(filledCount / totalTiles) * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-bold text-gray-400">{filledCount}/{totalTiles}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {categories.map(cat => {
          const val = parseFloat(itemWeights[cat.id]) || 0;
          const isFilled = val > 0;
          return (
            <div
              key={cat.id}
              className={`rounded-xl border-2 transition-all duration-200 p-3 ${
                isFilled
                  ? `${cat.borderColor} ${cat.bgLight} shadow-sm`
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${isFilled ? cat.color : 'text-gray-400'}`}>
                  {cat.shortName}
                </label>
                {isFilled && (
                  <span className={`text-[9px] font-bold ${cat.color} bg-white px-1.5 py-0.5 rounded-full`}>
                    {val.toFixed(1)} kg
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={itemWeights[cat.id] || ''}
                  onChange={e => onWeightChange(cat.id, e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-sm font-bold outline-none transition-all ${
                    isFilled
                      ? `${cat.borderColor} bg-white text-gray-900 focus:ring-2 focus:ring-[var(--accent)]/30`
                      : 'border-gray-200 bg-gray-50 text-gray-400 focus:bg-white focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30'
                  }`}
                />
                <span className="text-[10px] text-gray-400 font-bold flex-shrink-0">kg</span>
              </div>
            </div>
          );
        })}

        <div
          className={`col-span-2 rounded-xl border-2 p-3 transition-all duration-200 ${
            isOtherFilled
              ? 'border-[var(--accent)]/25 bg-[color-mix(in_srgb,var(--accent)_10%,white)] shadow-sm'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isOtherFilled ? 'text-[var(--accent)]' : 'text-gray-400'}`}>
              Other Material
            </label>
            {isOtherFilled && (
              <span className="text-[9px] font-bold text-[var(--accent)] bg-white px-1.5 py-0.5 rounded-full">
                {otherValue.toFixed(1)} kg
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              maxLength={40}
              placeholder="e.g. Textile, Tetra Pak, Scrap metal"
              value={otherName}
              onChange={e => onOtherNameChange(e.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-300 focus:bg-white focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all"
            />
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              value={otherKg}
              onChange={e => onOtherKgChange(e.target.value)}
              className={`w-24 rounded-lg border px-2.5 py-2 text-sm font-bold outline-none transition-all ${
                isOtherFilled
                  ? 'border-[var(--accent)]/30 bg-white text-gray-900 focus:ring-2 focus:ring-[var(--accent)]/30'
                  : 'border-gray-200 bg-gray-50 text-gray-400 focus:bg-white focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30'
              }`}
            />
            <span className="text-[10px] text-gray-400 font-bold flex-shrink-0">kg</span>
          </div>
          <p className="text-[9px] text-gray-400 font-medium mt-2">
            Not on the list? Log it here — Admin sees it in the completion notes; it is not added to market stock.
          </p>
        </div>
      </div>
    </div>
  );
};
