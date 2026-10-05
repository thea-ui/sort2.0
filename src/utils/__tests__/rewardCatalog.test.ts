import { describe, expect, it } from 'vitest';
import {
  draftFromReward,
  gramsToKg,
  kgToGrams,
  rewardPatchFromDraft,
  validateRewardDraft,
  type RewardDraft,
} from '../rewardCatalog';
import type { Reward } from '../../types';

const validDraft: RewardDraft = {
  title: 'Eco Green Tumbler',
  description: 'Collect 3 kg of plastic bottles.',
  rewardType: 'PHYSICAL',
  tierKg: '3',
  pointsValue: '0',
  stock: '24',
};

describe('gramsToKg / kgToGrams', () => {
  it('formats grams as a clean kg string', () => {
    expect(gramsToKg(3000)).toBe('3');
    expect(gramsToKg(1500)).toBe('1.5');
    expect(gramsToKg(250)).toBe('0.25');
    expect(gramsToKg(1)).toBe('0.001');
  });

  it('parses kg back to grams and rejects out-of-range input', () => {
    expect(kgToGrams('3')).toBe(3000);
    expect(kgToGrams('1.5')).toBe(1500);
    expect(kgToGrams('1000')).toBe(1_000_000);
    expect(kgToGrams('0')).toBeNull();
    expect(kgToGrams('-2')).toBeNull();
    expect(kgToGrams('abc')).toBeNull();
    expect(kgToGrams('1001')).toBeNull();
  });
});

describe('draftFromReward', () => {
  it('maps a catalog reward into editable strings', () => {
    const reward = {
      id: 'r1',
      code: 'TIER_3KG',
      title: 'Eco Green Tumbler',
      description: 'Collect 3 kg.',
      iconName: 'Gift',
      rewardType: 'PHYSICAL',
      requiredGrams: 3000,
      pointsValue: 25,
      stock: null,
    } as Reward;

    expect(draftFromReward(reward)).toEqual({
      title: 'Eco Green Tumbler',
      description: 'Collect 3 kg.',
      rewardType: 'PHYSICAL',
      tierKg: '3',
      pointsValue: '25',
      stock: '',
    });
  });
});

describe('validateRewardDraft', () => {
  it('accepts a valid physical draft', () => {
    expect(validateRewardDraft(validDraft)).toEqual({});
  });

  it('accepts a points reward with positive points and no stock', () => {
    expect(
      validateRewardDraft({ ...validDraft, rewardType: 'POINTS', pointsValue: '50', stock: '' })
    ).toEqual({});
  });

  it('rejects missing/oversized text and invalid numbers', () => {
    expect(validateRewardDraft({ ...validDraft, title: '  ' }).title).toBeTruthy();
    expect(validateRewardDraft({ ...validDraft, title: 'x'.repeat(121) }).title).toBeTruthy();
    expect(validateRewardDraft({ ...validDraft, description: '' }).description).toBeTruthy();
    expect(validateRewardDraft({ ...validDraft, tierKg: '0' }).tierKg).toBeTruthy();
    expect(validateRewardDraft({ ...validDraft, pointsValue: '1.5' }).pointsValue).toBeTruthy();
    expect(validateRewardDraft({ ...validDraft, stock: '-1' }).stock).toBeTruthy();
  });

  it('requires positive points for POINTS rewards', () => {
    expect(
      validateRewardDraft({ ...validDraft, rewardType: 'POINTS', pointsValue: '0' }).pointsValue
    ).toBeTruthy();
  });
});

describe('rewardPatchFromDraft', () => {
  it('produces a server-ready patch (empty stock = null)', () => {
    expect(rewardPatchFromDraft(validDraft)).toEqual({
      title: 'Eco Green Tumbler',
      description: 'Collect 3 kg of plastic bottles.',
      rewardType: 'PHYSICAL',
      requiredGrams: 3000,
      pointsValue: 0,
      stock: 24,
    });
    expect(rewardPatchFromDraft({ ...validDraft, stock: '  ' }).stock).toBeNull();
  });
});
