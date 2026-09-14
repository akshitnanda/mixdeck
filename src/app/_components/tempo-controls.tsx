"use client";

import { useRef, useState } from "react";
import { MAX_RATE, MIN_RATE, tapBpm } from "../_lib/tempo";

type Props = {
  deck: string;
  bpm: number;
  rate: number;
  onRate: (rate: number) => void;
  onSync: () => void;
  onBpm: (bpm: number) => Promise<string>;
};

export function TempoControls({ deck, bpm, rate, onRate, onSync, onBpm }: Props) {
  const [draft, setDraft] = useState(String(bpm));
  const [tapCount, setTapCount] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const taps = useRef<number[]>([]);
  const proposedBpm = Number(draft);
  const valid = draft.trim() !== "" && Number.isFinite(proposedBpm) && proposedBpm >= 40 && proposedBpm <= 240;

  const tap = () => {
    const now = performance.now();
    const previous = taps.current.at(-1);
    taps.current = previous !== undefined && now - previous <= 2000 ? [...taps.current, now].slice(-9) : [now];
    setTapCount(taps.current.length);
    const estimate = tapBpm(taps.current);
    if (estimate !== null) { setDraft(String(estimate)); setMessage("Tap estimate ready. Apply BPM when it matches the beat."); }
    else setMessage("Keep tapping steadily — at least four taps, 40–240 BPM.");
  };

  const apply = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try { setMessage(await onBpm(Math.round(proposedBpm * 10) / 10)); }
    catch { setMessage("Could not save BPM. Try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="tempo-controls">
      <div className="tempo-readout"><strong>{(bpm * rate).toFixed(1)} <small>BPM</small></strong><span>{rate >= 1 ? "+" : ""}{((rate - 1) * 100).toFixed(1)}%</span></div>
      <label className="tempo-slider">Playback speed
        <input type="range" aria-label={`Deck ${deck} playback speed`} min={MIN_RATE} max={MAX_RATE} step="0.001" value={rate} onChange={(event) => onRate(Number(event.target.value))} />
      </label>
      <div className="tempo-actions">
        <button disabled={rate <= MIN_RATE} onClick={() => onRate(rate - 0.001)} aria-label={`Slow deck ${deck} by 0.1 percent`}>−0.1%</button>
        <button onClick={() => onRate(1)}>Reset speed</button>
        <button disabled={rate >= MAX_RATE} onClick={() => onRate(rate + 0.001)} aria-label={`Speed deck ${deck} up by 0.1 percent`}>+0.1%</button>
      </div>
      <button className="tempo-sync" onClick={onSync}>Sync to other deck</button>
      <div className="bpm-calibration">
        <label>Track BPM<input aria-label={`Deck ${deck} track BPM`} type="number" inputMode="decimal" min="40" max="240" step="0.1" value={draft} onChange={(event) => { setDraft(event.target.value); setMessage(""); }} /></label>
        <button onClick={tap}>Tap BPM{tapCount ? ` · ${tapCount}` : ""}</button>
        <button disabled={!valid || saving} onClick={() => void apply()}>{saving ? "Saving…" : "Apply BPM"}</button>
      </div>
      <p className="tempo-help">Tap along or enter the original track BPM to calibrate sync, loops, and jumps. Applying a correction exits active loops on this track.</p>
      <p className="tempo-feedback" role="status">{message || (!valid ? "Enter a BPM between 40 and 240." : `Original tempo: ${bpm} BPM`)}</p>
    </div>
  );
}
