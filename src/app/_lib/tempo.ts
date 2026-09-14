export const MIN_RATE = 0.8;
export const MAX_RATE = 1.25;

export const clampRate = (rate: number) => Math.max(MIN_RATE, Math.min(MAX_RATE, rate));

export const matchingRate = (bpm: number, otherBpm: number, otherRate: number) => clampRate(otherBpm * otherRate / bpm);

// Media currentTime is measured in source seconds. Playback speed changes how
// quickly those seconds pass, not the distance between beats in the source.
export const beatSeconds = (beats: number, bpm: number) => beats * 60 / bpm;

export function tapBpm(taps: number[]): number | null {
  if (taps.length < 4) return null;
  const intervals = taps.slice(1).map((time, index) => time - taps[index]);
  if (intervals.some((interval) => !Number.isFinite(interval) || interval < 250 || interval > 1500)) return null;
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const steady = intervals.filter((interval) => Math.abs(interval - median) <= median * 0.2);
  if (steady.length < 3) return null;
  return Math.round(60000 / (steady.reduce((sum, interval) => sum + interval, 0) / steady.length) * 10) / 10;
}
