export function computeCollectionTotals(
  itemWeights: Record<string, string>,
  otherKg: string
): { totalWeight: number; filledCount: number } {
  const totalWeight =
    Object.values(itemWeights).reduce((sum, v) => sum + (parseFloat(v) || 0), 0) +
    (parseFloat(otherKg) || 0);
  const filledCount =
    Object.values(itemWeights).filter(v => (parseFloat(v) || 0) > 0).length +
    ((parseFloat(otherKg) || 0) > 0 ? 1 : 0);
  return { totalWeight, filledCount };
}
