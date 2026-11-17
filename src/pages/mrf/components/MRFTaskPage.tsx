import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  FolderTree,
  MapPin,
  Maximize2,
  Play,
  User,
  Wrench,
} from 'lucide-react';
import { Report } from '../../../types';
import { ASSET_DISPOSITIONS } from '../../../utils/assetDispositions';
import {
  cleanLocationName,
  cleanReportTitle,
  parseReportTags,
  stripReportTags,
} from '../../../utils/reportUtils';
import { computeCollectionTotals } from '../../../utils/collectionTotals';
import { formatDateTime } from '../../../utils/dateFormat';
import { RECYCLABLE_CATEGORIES, deriveAssetCategory } from '../MRFDashboard';
import { CollectedItemsInput } from './CollectedItemsInput';

export interface TaskCompletionPayload {
  itemWeights: Record<string, string>;
  otherMaterialName: string;
  otherMaterialKg: string;
  assetOutcome: string;
  assetScrapMaterial: string;
  assetScrapKg: string;
  weightKg: string;
  notes: string;
}

interface MRFTaskPageProps {
  report: Report;
  folderLabel: string;
  photoSrc?: string | null;
  onBack: () => void;
  onConfirmDispatch: (report: Report) => void;
  onComplete: (payload: TaskCompletionPayload) => Promise<void>;
  onOpenPhoto: () => void;
}

const MICRO_LABEL =
  'block text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/40';
const FIELD =
  'w-full rounded-xl border-2 border-[var(--primary)]/10 bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--text-strong)] outline-none transition-all placeholder:text-[var(--text-strong)]/25 focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15';
const CARD = 'bg-white/95 backdrop-blur-md border border-white/80 rounded-3xl p-5 sm:p-6 shadow-sm';

const URGENCY_META: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  LOW: { label: 'Low Priority', dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  MEDIUM: { label: 'Medium Priority', dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' },
  HIGH: { label: 'High Priority', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
};

export const MRFTaskPage: React.FC<MRFTaskPageProps> = ({
  report,
  folderLabel,
  photoSrc,
  onBack,
  onConfirmDispatch,
  onComplete,
  onOpenPhoto,
}) => {
  const [itemWeights, setItemWeights] = useState<Record<string, string>>({
    pet_plastic: '',
    aluminum_cans: '',
    cardboard: '',
    glass: '',
  });
  const [otherMaterialName, setOtherMaterialName] = useState(report.otherMaterialLabel || '');
  const [otherMaterialKg, setOtherMaterialKg] = useState('');
  const [assetOutcome, setAssetOutcome] = useState(ASSET_DISPOSITIONS[1].value);
  const [assetScrapMaterial, setAssetScrapMaterial] = useState('ferrous_metal');
  const [assetScrapKg, setAssetScrapKg] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const desc = report.description.toUpperCase();
  const isRecyclable = report.category === 'RECYCLABLE' || desc.includes('WASTE');
  const isAsset =
    report.reportType === 'ASSET' ||
    desc.includes('FURNITURE') ||
    desc.includes('ELECTRONICS') ||
    desc.includes('FIXTURES') ||
    desc.includes('EQUIPMENT');
  const isPending = report.status === 'PENDING';
  const urgency = URGENCY_META[report.urgency] ?? {
    label: 'Standard',
    dot: 'bg-gray-400',
    text: 'text-gray-600',
    bg: 'bg-gray-50',
  };
  const totalWeight = isRecyclable
    ? computeCollectionTotals(itemWeights, otherMaterialKg).totalWeight
    : parseFloat(weightKg) || 0;

  const reportedCodes = report.materials ?? [];
  const reportedCategories =
    reportedCodes.length > 0
      ? RECYCLABLE_CATEGORIES.filter((cat) => reportedCodes.includes(cat.id))
      : RECYCLABLE_CATEGORIES;

  const selectedDisposition = ASSET_DISPOSITIONS.find((d) => d.value === assetOutcome) ?? null;
  const observation = parseReportTags(report.description)['observation'];
  const freeText = stripReportTags(report.description);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isRecyclable && totalWeight <= 0) return;
    setSubmitting(true);
    try {
      await onComplete({
        itemWeights,
        otherMaterialName,
        otherMaterialKg,
        assetOutcome,
        assetScrapMaterial,
        assetScrapKg,
        weightKg,
        notes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-[var(--text-strong)]/70 transition hover:bg-[color-mix(in_srgb,var(--primary)_6%,white)]"
        >
          <ArrowLeft size={13} /> Back
        </button>
        <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--text-strong)]/60">
          <FolderTree size={14} className="text-[var(--accent)]" />
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer transition hover:text-[var(--text-strong)]"
          >
            Dispatches
          </button>
          <ChevronRight size={13} className="text-[var(--text-strong)]/30" />
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer transition hover:text-[var(--text-strong)]"
          >
            {folderLabel}
          </button>
          <ChevronRight size={13} className="text-[var(--text-strong)]/30" />
          <span className="font-bold text-[var(--text-strong)]">{cleanReportTitle(report.title)}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Task details */}
        <div className="space-y-4 lg:col-span-5">
          <div className={`${CARD} space-y-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
                  isPending
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)]'
                }`}
              >
                {isPending ? 'Unconfirmed' : 'Ongoing'}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold ${urgency.bg} ${urgency.text}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${urgency.dot}`} />
                {urgency.label}
              </span>
              <span className="ml-auto text-[11px] font-medium text-[var(--text-strong)]/40">
                {formatDateTime(report.timestamp)}
              </span>
            </div>

            <h2 className="text-lg font-heading font-black leading-snug text-[var(--text-strong)]">
              {cleanReportTitle(report.title)}
            </h2>

            <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-strong)]/65">
              <MapPin size={13} className="shrink-0 text-[var(--accent)]" />
              <span className="truncate">{cleanLocationName(report.locationName)}</span>
            </p>

            {photoSrc && (
              <button
                type="button"
                onClick={onOpenPhoto}
                className="group relative block h-44 w-full cursor-zoom-in overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-gray-100"
              >
                <img src={photoSrc} alt="Report evidence" className="h-full w-full object-cover" />
                <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/75 px-2.5 py-1 font-mono text-[10px] text-white backdrop-blur-xs">
                  <Maximize2 size={11} /> Tap to view full screen
                </span>
              </button>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {observation && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold capitalize text-amber-800">
                    {observation}
                  </span>
                )}
                {isAsset && (
                  <span className="rounded-full border border-[var(--primary)]/10 bg-[var(--background)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-strong)]/60">
                    {deriveAssetCategory(report.description)}
                  </span>
                )}
              </div>
              {freeText && (
                <p className="text-xs leading-relaxed text-[var(--text-strong)]/65">{freeText}</p>
              )}
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-strong)]/45">
                <User size={11} />
                Reported by{' '}
                <span className="font-bold text-[var(--text-strong)]/75">{report.reporterName}</span>
              </p>
            </div>
          </div>

          {isPending && (
            <button
              type="button"
              onClick={() => onConfirmDispatch(report)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-3 text-xs font-bold text-white shadow-md shadow-[var(--accent)]/20 transition hover:bg-[var(--accent-dark)]"
            >
              <Play size={15} /> Confirm Dispatch (Start Task)
            </button>
          )}
        </div>

        {/* Weighing / completion */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className={`${CARD} space-y-4`}>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-heading font-bold text-[var(--text-strong)]">
                <CheckCircle2 size={16} className="text-[var(--accent)]" />
                {isAsset ? 'Resolve Asset Task' : 'Weigh & Complete Collection'}
              </h3>
              <p className="mt-0.5 text-[11px] font-medium text-[var(--text-strong)]/45">
                {isPending
                  ? 'Confirm the dispatch first, then record the collection here.'
                  : 'Record the collected weight or asset outcome, then submit to Admin.'}
              </p>
            </div>

            {isPending ? (
              <div className="rounded-2xl border border-dashed border-[var(--primary)]/15 bg-[var(--background)]/50 px-4 py-10 text-center text-xs font-medium text-[var(--text-strong)]/45">
                This dispatch is still unconfirmed. Press “Confirm Dispatch (Start Task)” to begin.
              </div>
            ) : (
              <>
                {isRecyclable && (
                  <div className="space-y-3">
                    {reportedCodes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--primary)]/10 bg-[var(--background)]/50 px-3 py-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-strong)]/40">
                          Student identified
                        </span>
                        {reportedCategories.map((cat) => (
                          <span
                            key={cat.id}
                            className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]"
                          >
                            {cat.shortName}
                          </span>
                        ))}
                        {reportedCodes.includes('others') && (
                          <span className="rounded-full border border-[var(--primary)]/15 bg-white px-2 py-0.5 text-[10px] font-bold text-[var(--text-strong)]/70">
                            Mixed / Others{report.otherMaterialLabel ? `: ${report.otherMaterialLabel}` : ''}
                          </span>
                        )}
                      </div>
                    )}
                    <CollectedItemsInput
                      categories={reportedCategories}
                      itemWeights={itemWeights}
                      onWeightChange={(catId, value) =>
                        setItemWeights((prev) => ({ ...prev, [catId]: value }))
                      }
                      otherName={otherMaterialName}
                      onOtherNameChange={setOtherMaterialName}
                      otherKg={otherMaterialKg}
                      onOtherKgChange={setOtherMaterialKg}
                    />
                  </div>
                )}

                {isAsset && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                        <Wrench size={14} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-strong)]">Asset outcome</p>
                        <p className="text-[10px] font-medium text-gray-400">
                          Choose the resolution for this asset
                        </p>
                      </div>
                    </div>
                    <select
                      value={assetOutcome}
                      onChange={(e) => setAssetOutcome(e.target.value)}
                      className={`${FIELD} cursor-pointer`}
                    >
                      <optgroup label="Reuse / Recovery">
                        {ASSET_DISPOSITIONS.filter((d) => !d.scrap && !d.hazmat).map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.value}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Disposal">
                        {ASSET_DISPOSITIONS.filter((d) => d.scrap || d.hazmat).map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.value}
                          </option>
                        ))}
                      </optgroup>
                    </select>

                    {selectedDisposition?.scrap && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor="task-scrap-material" className={MICRO_LABEL}>
                            Material
                          </label>
                          <select
                            id="task-scrap-material"
                            value={assetScrapMaterial}
                            onChange={(e) => setAssetScrapMaterial(e.target.value)}
                            className={`${FIELD} mt-1 cursor-pointer`}
                          >
                            <option value="ferrous_metal">Ferrous Metal (Steel/Iron)</option>
                            <option value="non_ferrous_metal">Non-Ferrous Metal (Aluminum/Copper)</option>
                            <option value="plastic">Hard Plastic</option>
                            <option value="wood">Wood / Lumber</option>
                            <option value="glass">Glass</option>
                            <option value="mixed">Mixed / Other</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="task-scrap-kg" className={MICRO_LABEL}>
                            Weight (kg) — optional
                          </label>
                          <input
                            id="task-scrap-kg"
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="0.0"
                            value={assetScrapKg}
                            onChange={(e) => setAssetScrapKg(e.target.value)}
                            className={`${FIELD} mt-1`}
                          />
                        </div>
                      </div>
                    )}

                    {selectedDisposition?.hazmat && (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-600">
                        E-waste must go to a DENR-accredited handler — it will not be added to sellable
                        scrap stock.
                      </p>
                    )}
                  </div>
                )}

                {!isRecyclable && !isAsset && (
                  <div className="space-y-3 rounded-2xl border border-[var(--primary)]/10 bg-[var(--background)]/50 p-4">
                    <div>
                      <p className="text-xs font-bold text-[var(--text-strong)]">Standard Waste Collection</p>
                      <p className="text-[11px] leading-relaxed text-[var(--text-strong)]/50">
                        Confirming marks this task done and notifies{' '}
                        <span className="font-bold text-[var(--text-strong)]">{report.reporterName}</span>.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="task-weight-kg" className={MICRO_LABEL}>
                        Collected Weight (kg) — optional
                      </label>
                      <input
                        id="task-weight-kg"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Leave blank if not weighed"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className={`${FIELD} mt-1`}
                      />
                      <p className="mt-1 text-[10px] text-[var(--text-strong)]/40">
                        Only recyclables are weighed. Residual and biodegradable batches are monitored by
                        report and pickup counts.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="task-notes" className={MICRO_LABEL}>
                    Completion notes (optional)
                  </label>
                  <textarea
                    id="task-notes"
                    rows={3}
                    placeholder="Add any observations, issues, or notes for Admin…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${FIELD} mt-1 resize-none`}
                  />
                </div>

                {isRecyclable && totalWeight === 0 && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] font-bold text-amber-600">
                    Enter at least one weight above to confirm collection.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || (isRecyclable && totalWeight === 0)}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold text-white transition-all active:scale-[0.98] ${
                    submitting || (isRecyclable && totalWeight === 0)
                      ? 'cursor-not-allowed bg-gray-300 shadow-none'
                      : 'cursor-pointer bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] shadow-lg shadow-[var(--accent)]/25 hover:from-[var(--accent-dark)] hover:to-[var(--accent-darker)]'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  {submitting
                    ? 'Submitting…'
                    : isRecyclable && totalWeight > 0
                      ? `Confirm Completion — ${totalWeight.toFixed(1)} kg Total`
                      : 'Confirm Completion & Notify'}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
