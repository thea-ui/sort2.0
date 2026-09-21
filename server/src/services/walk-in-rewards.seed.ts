import { PrismaClient } from '@prisma/client';

/**
 * PLACEHOLDER prize catalog for walk-in bottle milestones.
 *
 * These are intentionally generic school-friendly rewards. Replace the titles,
 * values, and stock after the student/professor interview — the catalog is
 * data-driven, so no code change is required (edit rows or re-run the seed with
 * new values and a different `code`).
 *
 * Gram tiers are calibrated for PET bottles incl. cap + label (~19 g per
 * 500 ml bottle): 1 kg ~ 53 bottles, 3 kg ~ 158, 5 kg ~ 263, 10 kg ~ 526.
 */
export const PLACEHOLDER_WALK_IN_REWARDS = [
  {
    code: 'TIER_1KG',
    title: 'Recycler Badge (+25 pts)',
    description: 'Collect 1 kg of plastic bottles. Unlocks a bonus point reward.',
    iconName: 'BadgeCheck',
    rewardType: 'POINTS' as const,
    requiredGrams: 1000,
    pointsValue: 25,
    stock: null as number | null,
    sortOrder: 1,
  },
  {
    code: 'TIER_3KG',
    title: 'Eco Green Tumbler',
    description: 'Collect 3 kg of plastic bottles. Claim a reusable tumbler at the MRF office.',
    iconName: 'CupSoda',
    rewardType: 'PHYSICAL' as const,
    requiredGrams: 3000,
    pointsValue: 0,
    stock: 25,
    sortOrder: 2,
  },
  {
    code: 'TIER_5KG',
    title: 'MRF Tote + School Supplies Kit',
    description: 'Collect 5 kg of plastic bottles. Claim an eco tote with school supplies.',
    iconName: 'Backpack',
    rewardType: 'PHYSICAL' as const,
    requiredGrams: 5000,
    pointsValue: 0,
    stock: 15,
    sortOrder: 3,
  },
  {
    code: 'TIER_10KG',
    title: 'Eco-Champion Hoodie / Canteen Voucher',
    description: 'Collect 10 kg of plastic bottles. Claim the top-tier prize at the MRF office.',
    iconName: 'Trophy',
    rewardType: 'PHYSICAL' as const,
    requiredGrams: 10000,
    pointsValue: 0,
    stock: 10,
    sortOrder: 4,
  },
];

export async function seedWalkInRewards(prisma: PrismaClient): Promise<number> {
  let count = 0;
  for (const reward of PLACEHOLDER_WALK_IN_REWARDS) {
    await prisma.reward.upsert({
      where: { code: reward.code },
      // Never overwrite admin edits on re-seed; create-only.
      update: {},
      create: reward,
    });
    count++;
  }
  return count;
}
