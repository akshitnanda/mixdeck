"use client";

import { AudioLines, Radio, Waves } from "lucide-react";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LIVE_SNAPSHOT,
  isLiveSnapshot,
  LIVE_CHANNEL_NAME,
  LIVE_STORAGE_KEY,
  type LiveSnapshot,
} from "../_lib/live-state";
import styles from "./overlay.module.css";

const formatTime = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return `${Math.floor(safeSeconds / 60)}:${Math.floor(safeSeconds % 60).toString().padStart(2, "0")}`;
};

export default function OverlayPage() {
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(DEFAULT_LIVE_SNAPSHOT);
  const [clock, setClock] = useState(0);
  const [darkBackground, setDarkBackground] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const previousBodyBackground = document.body.style.background;
    const previousHtmlBackground = document.documentElement.style.background;
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";

    const applySnapshot = (value: unknown) => {
      if (isLiveSnapshot(value)) setSnapshot(value);
    };
    const restoreTimer = window.setTimeout(() => {
      const parameters = new URLSearchParams(window.location.search);
      setDarkBackground(parameters.get("background") === "dark");
      setCompact(parameters.get("compact") === "1");
      try {
        applySnapshot(JSON.parse(window.localStorage.getItem(LIVE_STORAGE_KEY) ?? "null"));
      } catch {
        window.localStorage.removeItem(LIVE_STORAGE_KEY);
      }
    }, 0);
    const clockTimer = window.setInterval(() => setClock(Date.now()), 500);
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(LIVE_CHANNEL_NAME);
    if (channel) channel.onmessage = (event) => applySnapshot(event.data);
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LIVE_STORAGE_KEY || !event.newValue) return;
      try {
        applySnapshot(JSON.parse(event.newValue));
      } catch {
        // Ignore incomplete cross-tab writes.
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearTimeout(restoreTimer);
      window.clearInterval(clockTimer);
      channel?.close();
      window.removeEventListener("storage", handleStorage);
      document.body.style.background = previousBodyBackground;
      document.documentElement.style.background = previousHtmlBackground;
    };
  }, []);

  const elapsed = useMemo(() => {
    if (!snapshot.playing || !snapshot.updatedAt || !clock) return snapshot.currentTime;
    return Math.min(snapshot.duration, snapshot.currentTime + Math.max(0, clock - snapshot.updatedAt) / 1000);
  }, [clock, snapshot]);
  const progress = Math.min(100, Math.max(0, (elapsed / Math.max(1, snapshot.duration)) * 100));

  return (
    <main className={`${styles.overlay} ${darkBackground ? styles.dark : ""} ${compact ? styles.compact : ""}`} data-testid="stream-overlay">
      <section className={styles.card} style={{ "--live-accent": snapshot.accent } as CSSProperties}>
        <div className={styles.cover}>
          <span className={styles.orbit} />
          <span className={styles.core} />
          <Waves size={18} />
        </div>
        <div className={styles.copy}>
          <div className={styles.liveLine}><Radio size={11} /><span>{snapshot.playing ? "NOW PLAYING" : "MIXDECK READY"}</span><i />DECK {snapshot.deck}</div>
          <strong>{snapshot.title}</strong>
          <p>{snapshot.artist}</p>
          <div className={styles.progress}><span style={{ width: `${progress}%` }} /></div>
        </div>
        <div className={styles.metrics}>
          <AudioLines size={14} />
          <strong>{snapshot.bpm || "—"}</strong><span>BPM</span>
          <b>{snapshot.key}</b>
          <time>{formatTime(elapsed)}</time>
        </div>
      </section>
    </main>
  );
}
