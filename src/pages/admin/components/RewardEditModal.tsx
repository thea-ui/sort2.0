import React, { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { AppModal } from '../../../components/common/AppModal';
import type { Reward } from '../../../types';
import {
  draftFromReward,
  rewardPatchFromDraft,
  validateRewardDraft,
  type RewardDraft,
  type RewardPatch,
} from '../../../utils/rewardCatalog';

const EMPTY_DRAFT: RewardDraft = {
  title: '',
  description: '',
  rewardType: 'PHYSICAL',
  tierKg: '',
  pointsValue: '0',
  stock: '',
};

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-[var(--text-strong)] outline-none focus:border-[var(--accent)] transition-all';

const Field: React.FC<{
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ id, label, error, hint, children }) => (
  <div>
    <label htmlFor={id} className="text-xs font-bold text-[var(--text-strong)]/50 uppercase">
      {label}
    </label>
    <div className="mt-1.5">{children}</div>
    {error ? (
      <p role="alert" className="text-[11px] font-bold text-rose-600 mt-1">
        {error}
      </p>
    ) : hint ? (
      <p className="text-[11px] text-[var(--text-strong)]/40 mt-1">{hint}</p>
    ) : null}
  </div>
);

interface RewardEditModalProps {
  reward: Reward | null;
  onClose: () => void;
  /** Persist the patch; reject with an Error to surface the message inline. */
  onSubmit: (patch: RewardPatch) => Promise<void>;
}

export const RewardEditModal: React.FC<RewardEditModalProps> = ({ reward, onClose, onSubmit }) => {
  const [draft, setDraft] = useState<RewardDraft>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reward) {
      setDraft(draftFromReward(reward));
      setFieldErrors({});
      setApiError(null);
      setSaving(false);
    }
  }, [reward]);

  const setField = <K extends keyof RewardDraft>(key: K, value: RewardDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!reward) return;
    const errors = validateRewardDraft(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setApiError(null);
    try {
      await onSubmit(rewardPatchFromDraft(draft));
    } catch (err: any) {
      setApiError(err?.message || 'Failed to update prize.');
      setSaving(false);
    }
  };

  const isPhysical = draft.rewardType === 'PHYSICAL';

  return (
    <AppModal
      open={reward !== null}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
      icon={<Pencil />}
      title="Edit prize"
      description={
        reward
          ? `${reward.code} · changes apply to future unlocks; existing claims keep their snapshot.`
          : undefined
      }
      confirmLabel="Save changes"
      loading={saving}
      onConfirm={handleSave}
    >
      {apiError && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700"
        >
          {apiError}
        </div>
      )}

      <div className="space-y-4">
        <Field id="reward-title" label="Title" error={fieldErrors.title}>
          <input
            id="reward-title"
            type="text"
            value={draft.title}
            maxLength={120}
            onChange={(e) => setField('title', e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>

        <Field id="reward-description" label="Description" error={fieldErrors.description}>
          <textarea
            id="reward-description"
            value={draft.description}
            maxLength={500}
            rows={3}
            onChange={(e) => setField('description', e.target.value)}
            className={`${INPUT_CLASS} resize-none`}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="reward-type" label="Type">
            <select
              id="reward-type"
              value={draft.rewardType}
              onChange={(e) => setField('rewardType', e.target.value as RewardDraft['rewardType'])}
              className={INPUT_CLASS}
            >
              <option value="PHYSICAL">Physical prize</option>
              <option value="POINTS">Points reward</option>
            </select>
          </Field>

          <Field
            id="reward-tier"
            label="Tier (kg)"
            error={fieldErrors.tierKg}
            hint="Bottle weight that unlocks this prize."
          >
            <input
              id="reward-tier"
              type="number"
              min={0.001}
              step={0.1}
              value={draft.tierKg}
              onChange={(e) => setField('tierKg', e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>

          <Field
            id="reward-points"
            label="Points on release"
            error={fieldErrors.pointsValue}
            hint={isPhysical ? 'Optional bonus points.' : 'Required for points rewards.'}
          >
            <input
              id="reward-points"
              type="number"
              min={0}
              step={1}
              value={draft.pointsValue}
              onChange={(e) => setField('pointsValue', e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>

          {isPhysical && (
            <Field
              id="reward-stock"
              label="Stock"
              error={fieldErrors.stock}
              hint="Empty = unlimited."
            >
              <input
                id="reward-stock"
                type="number"
                min={0}
                step={1}
                value={draft.stock}
                onChange={(e) => setField('stock', e.target.value)}
                placeholder="∞"
                className={INPUT_CLASS}
              />
            </Field>
          )}
        </div>
      </div>
    </AppModal>
  );
};
