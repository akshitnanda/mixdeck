export type AudioAnalysis = {
  duration: number;
  key: string;
  keyLabel: string;
  confidence: number;
  cuePoint: number;
  cueConfidence: number;
};

export type CueSuggestion = {
  time: number;
  confidence: number;
};

const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const MAJOR_CAMELOT = ["8B", "3B", "10B", "5B", "12B", "7B", "2B", "9B", "4B", "11B", "6B", "1B"];
const MINOR_CAMELOT = ["5A", "12A", "7A", "2A", "9A", "4A", "11A", "6A", "1A", "8A", "3A", "10A"];

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

export function detectCuePoint(samples: Float32Array, sampleRate: number): CueSuggestion {
  if (!samples.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return { time: 0, confidence: 0 };

  const frameSize = Math.max(64, Math.round(sampleRate * 0.024));
  const hopSize = Math.max(32, Math.round(sampleRate * 0.012));
  const scanLength = Math.min(samples.length, Math.round(sampleRate * 30));
  const rms: number[] = [];
  for (let start = 0; start + frameSize <= scanLength; start += hopSize) {
    let energy = 0;
    for (let index = 0; index < frameSize; index += 1) {
      const sample = samples[start + index];
      energy += sample * sample;
    }
    rms.push(Math.sqrt(energy / frameSize));
  }

  if (!rms.length) return { time: 0, confidence: 0.1 };
  const peak = Math.max(...rms);
  if (peak < 0.004) return { time: 0, confidence: 0.15 };

  const openingFrameCount = Math.max(1, Math.min(rms.length, Math.round(1 / (hopSize / sampleRate))));
  const opening = rms.slice(0, openingFrameCount).sort((left, right) => left - right);
  const noiseFloor = opening[Math.floor((opening.length - 1) * 0.2)] ?? 0;
  const activation = Math.min(peak * 0.55, Math.max(0.004, peak * 0.12, noiseFloor * 3.2));

  let onsetFrame = 0;
  for (let index = 0; index < rms.length; index += 1) {
    const sustainedFrames = rms.slice(index, index + 4).filter((value) => value >= activation * 0.75).length;
    if (rms[index] >= activation && sustainedFrames >= Math.min(3, rms.length - index)) {
      onsetFrame = index;
      break;
    }
  }

  const rawTime = onsetFrame * hopSize / sampleRate;
  const time = rawTime < 0.08 ? 0 : Math.max(0, rawTime - 0.025);
  const contrast = clamp((rms[onsetFrame] - noiseFloor) / Math.max(0.0001, peak - noiseFloor), 0, 1);
  const leadInBonus = clamp(rawTime / 2, 0, 1) * 0.2;
  const confidence = clamp(0.42 + contrast * 0.32 + leadInBonus, 0.15, 0.94);
  return { time, confidence };
}

const correlation = (chroma: number[], profile: number[], root: number) => {
  const chromaMean = chroma.reduce((sum, value) => sum + value, 0) / chroma.length;
  const profileMean = profile.reduce((sum, value) => sum + value, 0) / profile.length;
  let numerator = 0;
  let chromaEnergy = 0;
  let profileEnergy = 0;
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    const centeredChroma = chroma[pitchClass] - chromaMean;
    const centeredProfile = profile[(pitchClass - root + 12) % 12] - profileMean;
    numerator += centeredChroma * centeredProfile;
    chromaEnergy += centeredChroma * centeredChroma;
    profileEnergy += centeredProfile * centeredProfile;
  }
  return numerator / Math.max(0.000001, Math.sqrt(chromaEnergy * profileEnergy));
};

export async function analyzeAudioFile(file: Blob): Promise<AudioAnalysis> {
  const context = new AudioContext({ latencyHint: "playback" });
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const samples = buffer.getChannelData(0);
    const cue = detectCuePoint(samples, buffer.sampleRate);
    const stride = Math.max(1, Math.floor(buffer.sampleRate / 8000));
    const analysisRate = buffer.sampleRate / stride;
    const start = Math.min(Math.floor(samples.length * 0.08), Math.max(0, samples.length - 1));
    const sampleCount = Math.min(Math.floor(analysisRate * 12), Math.floor((samples.length - start) / stride));
    if (sampleCount < 1024) {
      return { duration: buffer.duration, key: "—", keyLabel: "Unavailable", confidence: 0, cuePoint: cue.time, cueConfidence: cue.confidence };
    }

    let mean = 0;
    for (let index = 0; index < sampleCount; index += 1) mean += samples[start + index * stride];
    mean /= sampleCount;
    const windowed = new Float32Array(sampleCount);
    for (let index = 0; index < sampleCount; index += 1) {
      const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * index / (sampleCount - 1));
      windowed[index] = (samples[start + index * stride] - mean) * window;
    }

    const chroma = Array(12).fill(0) as number[];
    for (let midi = 36; midi < 84; midi += 1) {
      const frequency = 440 * Math.pow(2, (midi - 69) / 12);
      const phaseStep = 2 * Math.PI * frequency / analysisRate;
      const cosineStep = Math.cos(phaseStep);
      const sineStep = Math.sin(phaseStep);
      let cosine = 1;
      let sine = 0;
      let real = 0;
      let imaginary = 0;
      for (let index = 0; index < sampleCount; index += 1) {
        const sample = windowed[index];
        real += sample * cosine;
        imaginary -= sample * sine;
        const nextCosine = cosine * cosineStep - sine * sineStep;
        sine = sine * cosineStep + cosine * sineStep;
        cosine = nextCosine;
      }
      const octaveWeight = 1 - Math.abs(midi - 59.5) / 95;
      chroma[midi % 12] += Math.hypot(real, imaginary) * octaveWeight;
    }

    const total = chroma.reduce((sum, value) => sum + value, 0);
    if (total <= 0.000001) {
      return { duration: buffer.duration, key: "—", keyLabel: "Unavailable", confidence: 0, cuePoint: cue.time, cueConfidence: cue.confidence };
    }
    const normalized = chroma.map((value) => value / total);
    const candidates = NOTE_NAMES.flatMap((name, root) => [
      { root, mode: "major" as const, score: correlation(normalized, MAJOR_PROFILE, root), name },
      { root, mode: "minor" as const, score: correlation(normalized, MINOR_PROFILE, root), name },
    ]).sort((left, right) => right.score - left.score);
    const best = candidates[0];
    const runnerUp = candidates[1];
    return {
      duration: buffer.duration,
      key: best.mode === "major" ? MAJOR_CAMELOT[best.root] : MINOR_CAMELOT[best.root],
      keyLabel: `${best.name} ${best.mode}`,
      confidence: Math.max(0, Math.min(1, 0.5 + (best.score - runnerUp.score) * 1.8)),
      cuePoint: cue.time,
      cueConfidence: cue.confidence,
    };
  } finally {
    await context.close();
  }
}
