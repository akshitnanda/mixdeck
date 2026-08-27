export const LIVE_CHANNEL_NAME = "mixdeck-live";
export const LIVE_STORAGE_KEY = "mixdeck-live-state";

export type LiveSnapshot = {
  deck: "A" | "B";
  title: string;
  artist: string;
  bpm: number;
  key: string;
  currentTime: number;
  duration: number;
  playing: boolean;
  accent: string;
  updatedAt: number;
};

export const DEFAULT_LIVE_SNAPSHOT: LiveSnapshot = {
  deck: "A",
  title: "Waiting for MixDeck",
  artist: "Start a deck to update the overlay",
  bpm: 0,
  key: "—",
  currentTime: 0,
  duration: 1,
  playing: false,
  accent: "#21d8e8",
  updatedAt: 0,
};

export function isLiveSnapshot(value: unknown): value is LiveSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<LiveSnapshot>;
  return (snapshot.deck === "A" || snapshot.deck === "B")
    && typeof snapshot.title === "string"
    && typeof snapshot.artist === "string"
    && typeof snapshot.bpm === "number"
    && typeof snapshot.key === "string"
    && typeof snapshot.currentTime === "number"
    && typeof snapshot.duration === "number"
    && typeof snapshot.playing === "boolean"
    && typeof snapshot.accent === "string"
    && typeof snapshot.updatedAt === "number";
}
