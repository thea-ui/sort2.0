import React, { useState } from 'react';
import { Minus, Plus, Recycle, PlusCircle } from 'lucide-react';
import { BOTTLE_PRESETS_ML, formatBottleLabel, gramsForBottle } from '../../../hooks/useWalkInTurnover';

interface BottleSizeStepperProps {
  lines: Record<number, number>;
  onChange: (bottleMl: number, quantity: number) => void;
  disabled?: boolean;
}

export const BottleSizeStepper: React.FC<BottleSizeStepperProps> = ({ lines, onChange, disabled }) => {
  const [otherMl, setOtherMl] = useState('');
  const [otherError, setOtherError] = useState<string | null>(null);

  const otherLines = Object.keys(lines)
    .map(Number)
    .filter((ml) => !BOTTLE_PRESETS_ML.includes(ml));

  const handleAddOther = () => {
    const ml = Math.round(Number(otherMl));
    if (!Number.isInteger(ml) || ml < 100 || ml > 20000) {
      setOtherError('Enter 100–20,000 ml');
      return;
    }
    setOtherError(null);
    onChange(ml, (lines[ml] || 0) + 1);
    setOtherMl('');
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {BOTTLE_PRESETS_ML.map((ml) => {
          const qty = lines[ml] || 0;
          const active = qty > 0;
          return (
            <div
              key={ml}
              className={`rounded-2xl border p-3 transition-all ${
                active
                  ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_5%,white)] ring-2 ring-[var(--accent)]/15'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-black ${active ? 'text-[var(--text-strong)]' : 'text-[var(--text-strong)]/70'}`}>
                  {formatBottleLabel(ml)}
                </span>
                <Recycle size={12} className={active ? 'text-[var(--accent)]' : 'text-gray-300'} />
              </div>
              <p className="text-[9px] text-gray-400 font-bold mb-2">~{gramsForBottle(ml)} g each</p>
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  disabled={disabled || qty === 0}
                  onClick={() => onChange(ml, qty - 1)}
                  className="h-7 w-7 rounded-lg border border-gray-200 flex items-center justify-center text-[var(--text-strong)] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  aria-label={`Remove one ${formatBottleLabel(ml)} bottle`}
                >
                  <Minus size={12} />
                </button>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={qty || ''}
                  disabled={disabled}
                  onChange={(e) => onChange(ml, Number(e.target.value))}
                  placeholder="0"
                  className="w-11 text-center text-sm font-black text-[var(--text-strong)] bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  disabled={disabled || qty >= 200}
                  onClick={() => onChange(ml, qty + 1)}
                  className="h-7 w-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white hover:bg-[var(--accent-dark)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  aria-label={`Add one ${formatBottleLabel(ml)} bottle`}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Other sizes */}
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Other size</span>
          <input
            type="number"
            min={100}
            max={20000}
            value={otherMl}
            disabled={disabled}
            onChange={(e) => setOtherMl(e.target.value)}
            placeholder="ml (100–20,000)"
            className="w-36 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-[var(--text-strong)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            disabled={disabled || !otherMl}
            onClick={handleAddOther}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--primary)] text-white text-[11px] font-bold hover:bg-[var(--primary-light)] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <PlusCircle size={12} /> Add
          </button>
          {otherError && <span className="text-[10px] font-bold text-rose-600">{otherError}</span>}
        </div>

        {otherLines.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2.5">
            {otherLines.map((ml) => (
              <div key={ml} className="flex items-center gap-2 bg-white border border-[var(--accent)]/30 rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] font-black text-[var(--text-strong)]">{formatBottleLabel(ml)}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onChange(ml, (lines[ml] || 0) - 1)}
                    className="h-5 w-5 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 cursor-pointer"
                    aria-label={`Remove one ${formatBottleLabel(ml)} bottle`}
                  >
                    <Minus size={10} />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-[var(--accent)]">{lines[ml]}</span>
                  <button
                    type="button"
                    onClick={() => onChange(ml, (lines[ml] || 0) + 1)}
                    className="h-5 w-5 rounded-md bg-[var(--accent)] text-white flex items-center justify-center hover:bg-[var(--accent-dark)] cursor-pointer"
                    aria-label={`Add one ${formatBottleLabel(ml)} bottle`}
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
