export type MixEnergy = "Low" | "Medium" | "High";

export type MixTrackProfile = {
  bpm: number;
  key: string;
  energy: MixEnergy;
  genre: string;
};

export type MixCompatibility = {
  score: number;
  rating: "Prime" | "Strong" | "Workable" | "Bold";
  bpmLabel: string;
  keyLabel: string;
  energyLabel: string;
};

type CamelotKey = { number: number; mode: "A" | "B" };

const ENERGY_RANK: Record<MixEnergy, number> = { Low: 0, Medium: 1, High: 2 };

function parseCamelotKey(value: string): CamelotKey | null {
  const match = value.trim().toUpperCase().match(/^(1[0-2]|[1-9])([AB])$/);
  if (!match) return null;
  return { number: Number(match[1]), mode: match[2] as CamelotKey["mode"] };
}

function wheelDistance(left: number, right: number) {
  const direct = Math.abs(left - right);
  return Math.min(direct, 12 - direct);
}

function scoreKey(sourceKey: string, candidateKey: string) {
  const source = parseCamelotKey(sourceKey);
  const candidate = parseCamelotKey(candidateKey);
  if (!source || !candidate) return { points: 0, label: "Key pending" };

  const distance = wheelDistance(source.number, candidate.number);
  if (distance === 0 && source.mode === candidate.mode) return { points: 35, label: `${candidateKey} key lock` };
  if (distance === 0) return { points: 32, label: `${candidateKey} relative mode` };
  if (distance === 1 && source.mode === candidate.mode) return { points: 31, label: `${candidateKey} harmonic step` };
  if (distance === 2 && source.mode === candidate.mode) return { points: 20, label: `${candidateKey} open blend` };
  return { points: source.mode === candidate.mode ? 10 : 7, label: `${candidateKey} key contrast` };
}

export function getMixCompatibility(source: MixTrackProfile, candidate: MixTrackProfile): MixCompatibility {
  const bpmDelta = candidate.bpm - source.bpm;
  const bpmPoints = Math.max(0, 45 - Math.abs(bpmDelta) * 3);
  const key = scoreKey(source.key, candidate.key);
  const energyDelta = ENERGY_RANK[candidate.energy] - ENERGY_RANK[source.energy];
  const energyPoints = Math.abs(energyDelta) === 0 ? 15 : Math.abs(energyDelta) === 1 ? 9 : 3;
  const genrePoints = source.genre === candidate.genre ? 5 : 0;
  const score = Math.round(bpmPoints + key.points + energyPoints + genrePoints);
  const rating = score >= 85 ? "Prime" : score >= 70 ? "Strong" : score >= 55 ? "Workable" : "Bold";
  const bpmLabel = bpmDelta === 0 ? "Tempo lock" : `${bpmDelta > 0 ? "+" : ""}${bpmDelta} BPM`;
  const energyLabel = energyDelta === 0
    ? `Hold ${candidate.energy.toLowerCase()}`
    : energyDelta > 0
      ? `Lift to ${candidate.energy.toLowerCase()}`
      : `Ease to ${candidate.energy.toLowerCase()}`;

  return { score, rating, bpmLabel, keyLabel: key.label, energyLabel };
}
