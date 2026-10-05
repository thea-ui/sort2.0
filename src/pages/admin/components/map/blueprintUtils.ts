export const MIN_BP_SCALE = 0.25;
export const MAX_BP_SCALE = 4;

export const clampScale = (n: number) =>
  Math.min(MAX_BP_SCALE, Math.max(MIN_BP_SCALE, Math.round(n * 100) / 100));

export const clampOffset = (n: number) =>
  Math.min(300, Math.max(-300, Math.round(n * 10) / 10));
