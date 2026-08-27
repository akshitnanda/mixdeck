export type AudioAnalysis = {
  duration: number;
  key: string;
  keyLabel: string;
  confidence: number;
};

const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const MAJOR_CAMELOT = ["8B", "3B", "10B", "5B", "12B", "7B", "2B", "9B", "4B", "11B", "6B", "1B"];
const MINOR_CAMELOT = ["5A", "12A", "7A", "2A", "9A", "4A", "11A", "6A", "1A", "8A", "3A", "10A"];

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
    const stride = Math.max(1, Math.floor(buffer.sampleRate / 8000));
    const analysisRate = buffer.sampleRate / stride;
    const start = Math.min(Math.floor(samples.length * 0.08), Math.max(0, samples.length - 1));
    const sampleCount = Math.min(Math.floor(analysisRate * 12), Math.floor((samples.length - start) / stride));
    if (sampleCount < 1024) throw new Error("Audio is too short for key analysis.");

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
    if (total <= 0.000001) throw new Error("No tonal content was found.");
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
    };
  } finally {
    await context.close();
  }
}
