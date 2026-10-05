import type { Reward, RewardType } from '../types';

// ─── Prize catalog edit model ──────────────────────────────────────────
// Pure draft <-> patch mapping + validation mirroring the server rules in
// `server/src/services/reward.service.ts` (validateRewardInput). Kept free of
// React so the edit modal stays presentational and this logic is unit-tested.

export interface RewardDraft {
  title: string;
  description: string;
  rewardType: RewardType;
  /** Tier weight in kg (string so the input can be empty while typing). */
  tierKg: string;
  pointsValue: string;
  /** Empty string = unlimited (null on the server). */
  stock: string;
}

export interface RewardPatch {
  title: string;
  description: string;
  rewardType: RewardType;
  requiredGrams: number;
  pointsValue: number;
  stock: number | null;
}

export function gramsToKg(grams: number): string {
  const kg = grams / 1000;
  return Number.isInteger(kg) ? String(kg) : String(Number(kg.toFixed(3)));
}

export function kgToGrams(value: string): number | null {
  const kg = Number(value.trim());
  if (!Number.isFinite(kg) || kg <= 0) return null;
  const grams = Math.round(kg * 1000);
  return grams >= 1 && grams <= 1_000_000 ? grams : null;
}

export function draftFromReward(reward: Reward): RewardDraft {
  return {
    title: reward.title,
    description: reward.description,
    rewardType: reward.rewardType,
    tierKg: gramsToKg(reward.requiredGrams),
    pointsValue: String(reward.pointsValue ?? 0),
    stock: reward.stock === null || reward.stock === undefined ? '' : String(reward.stock),
  };
}

/** Field errors keyed by draft field; empty object = valid. */
export function validateRewardDraft(draft: RewardDraft): Record<string, string> {
  const errors: Record<string, string> = {};

  const title = draft.title.trim();
  if (!title) errors.title = 'Title is required.';
  else if (title.length > 120) errors.title = 'Title must be 120 characters or fewer.';

  const description = draft.description.trim();
  if (!description) errors.description = 'Description is required.';
  else if (description.length > 500) errors.description = 'Description must be 500 characters or fewer.';

  if (kgToGrams(draft.tierKg) === null) {
    errors.tierKg = 'Tier must be between 0.001 kg and 1,000 kg.';
  }

  const points = Number(draft.pointsValue.trim());
  if (!Number.isInteger(points) || points < 0 || points > 100_000) {
    errors.pointsValue = 'Points must be a whole number between 0 and 100,000.';
  } else if (draft.rewardType === 'POINTS' && points <= 0) {
    errors.pointsValue = 'Points rewards must award more than 0 points.';
  }

  const stockRaw = draft.stock.trim();
  if (stockRaw !== '') {
    const stock = Number(stockRaw);
    if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) {
      errors.stock = 'Stock must be a whole number, or empty for unlimited.';
    }
  }

  return errors;
}

/** Assumes `validateRewardDraft` returned no errors. */
export function rewardPatchFromDraft(draft: RewardDraft): RewardPatch {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    rewardType: draft.rewardType,
    requiredGrams: kgToGrams(draft.tierKg) ?? 0,
    pointsValue: Number(draft.pointsValue.trim()),
    stock: draft.stock.trim() === '' ? null : Number(draft.stock.trim()),
  };
}
