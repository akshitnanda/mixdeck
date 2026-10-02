export function transitionDurationMs(beats: number, bpm: number, rate: number): number | null {
  if (![4, 8, 16].includes(beats) || !Number.isFinite(bpm) || !Number.isFinite(rate) || bpm <= 0 || rate <= 0) return null;
  return beats * 60000 / (bpm * rate);
}

export function crossfadePosition(start: number, target: number, elapsed: number, duration: number): number {
  const progress = duration <= 0 ? 1 : Math.max(0, Math.min(1, elapsed / duration));
  const eased = progress * progress * (3 - 2 * progress);
  return Math.max(0, Math.min(1, start + (target - start) * eased));
}
