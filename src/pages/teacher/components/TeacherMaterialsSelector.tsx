import React from 'react';
import { Check } from 'lucide-react';
import { REPORT_MATERIALS } from '../../../utils/materials';

interface TeacherMaterialsSelectorProps {
  selectedMaterials: string[];
  setSelectedMaterials: (materials: string[]) => void;
  otherMaterialLabel: string;
  setOtherMaterialLabel: (label: string) => void;
}

export const TeacherMaterialsSelector: React.FC<TeacherMaterialsSelectorProps> = ({
  selectedMaterials,
  setSelectedMaterials,
  otherMaterialLabel,
  setOtherMaterialLabel,
}) => {
  const toggleMaterial = (code: string) => {
    const checked = selectedMaterials.includes(code);
    if (checked) {
      setSelectedMaterials(selectedMaterials.filter((entry) => entry !== code));
      return;
    }
    setSelectedMaterials(
      code === 'others'
        ? ['others']
        : [...selectedMaterials.filter((entry) => entry !== 'others'), code]
    );
  };

  return (
    <div className="rounded-2xl border border-[var(--primary)]/10 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-[var(--text-strong)]">What materials are inside this bin?</p>
          <p className="mt-0.5 text-[10px] font-medium text-[var(--text-strong)]/50">
            Lets MRF log recovery weights without re-checking the photo.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[var(--accent)]">
          {selectedMaterials.length > 0 ? `${selectedMaterials.length} selected` : 'Required'}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {REPORT_MATERIALS.map((material) => {
          const checked = selectedMaterials.includes(material.code);
          return (
            <button
              key={material.code}
              type="button"
              aria-pressed={checked}
              onClick={() => toggleMaterial(material.code)}
              className={`flex min-h-[44px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-[11.5px] font-bold transition-colors ${
                checked
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-strong)]'
                  : 'border-[var(--primary)]/10 bg-white text-[var(--text-strong)]/70 hover:border-[var(--accent)]/30'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  checked ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-gray-300 bg-white'
                }`}
              >
                {checked && <Check size={10} />}
              </span>
              <span className="min-w-0 flex-1">{material.label}</span>
            </button>
          );
        })}
      </div>

      {selectedMaterials.includes('others') && (
        <input
          type="text"
          maxLength={60}
          value={otherMaterialLabel}
          onChange={(e) => setOtherMaterialLabel(e.target.value)}
          placeholder="Describe the mixed/unlisted material (optional)"
          className="mt-2 w-full rounded-xl border border-[var(--primary)]/10 bg-white px-3 py-2 text-xs font-semibold text-[var(--text-strong)] outline-none placeholder:text-gray-300 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        />
      )}
    </div>
  );
};
