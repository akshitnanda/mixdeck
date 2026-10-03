const EPSILON = 1e-7;

export function validGridAnchor(value: unknown, duration: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && Number.isFinite(duration) && value < duration ? value : null;
}

const validTempo = (bpm: number) => Number.isFinite(bpm) && bpm >= 40 && bpm <= 240;

export function gridPosition(time: number, bpm: number, anchor: number | null | undefined) {
  if (!Number.isFinite(time) || !validTempo(bpm) || typeof anchor !== "number" || !Number.isFinite(anchor) || anchor < 0) return null;
  const beforeAnchor = time < anchor - EPSILON;
  const index = Math.max(0, Math.floor((time - anchor) * bpm / 60 + EPSILON));
  return { beforeAnchor, beat: index % 4 + 1, bar: Math.floor(index / 4) % 8 + 1, phrase: Math.floor(index / 32) + 1 };
}

// All grid math uses source seconds; playback speed must not move saved beats.
export function nearestGridBeat(time: number, bpm: number, anchor: number | null | undefined, duration: number): number | null {
  if (!Number.isFinite(time) || !validTempo(bpm) || validGridAnchor(anchor, duration) === null) return null;
  const origin = anchor as number;
  const step = 60 / bpm;
  const lastIndex = Math.max(0, Math.ceil((duration - origin) / step - EPSILON) - 1);
  const index = Math.max(0, Math.min(lastIndex, Math.round((time - origin) / step)));
  return origin + index * step;
}

export function gridJumpTarget(time: number, bpm: number, anchor: number | null | undefined, duration: number, direction: -1 | 1, beats: 4 | 32): number | null {
  if (!Number.isFinite(time) || !validTempo(bpm) || validGridAnchor(anchor, duration) === null) return null;
  const origin = anchor as number;
  const step = beats * 60 / bpm;
  const relative = (time - origin) / step;
  const index = direction === 1 ? Math.max(0, Math.floor(relative + EPSILON) + 1) : Math.ceil(relative - EPSILON) - 1;
  const target = origin + Math.max(0, index) * step;
  if (index < 0 || target >= duration - EPSILON || (direction === 1 && target <= time) || (direction === -1 && target >= time)) return null;
  return target;
}

export function gridLoopRange(time: number, beats: number, bpm: number, anchor: number | null | undefined, duration: number) {
  if (!Number.isFinite(beats) || beats < 1) return null;
  const start = nearestGridBeat(time, bpm, anchor, duration);
  if (start === null) return null;
  const end = start + beats * 60 / bpm;
  return end <= duration + EPSILON ? { start, end: Math.min(end, duration) } : null;
}

export function gridMarkers(bpm: number, anchor: number | null | undefined, duration: number) {
  if (!validTempo(bpm) || validGridAnchor(anchor, duration) === null) return [];
  const origin = anchor as number;
  const barSeconds = 240 / bpm;
  const barCount = Math.ceil((duration - origin) / barSeconds);
  const stride = Math.max(1, Math.ceil(barCount / 48));
  return Array.from({ length: Math.min(48, Math.ceil(barCount / stride)) }, (_, index) => ({
    time: origin + index * stride * barSeconds,
    phraseStart: index * stride % 8 === 0,
  }));
}
