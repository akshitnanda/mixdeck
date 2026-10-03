"use client";

import { useState } from "react";
import { gridJumpTarget, gridPosition, validGridAnchor } from "../_lib/beat-grid";

type Props = {
  deck: string;
  bpm: number;
  currentTime: number;
  duration: number;
  anchor?: number | null;
  snap: boolean;
  playable: boolean;
  onAnchor: (value: number | null | "playhead") => Promise<string>;
  onSnap: () => void;
  onSeek: (target: number) => void;
  onJump: (direction: -1 | 1, beats: 4 | 32) => void;
};

export function BeatGridControls({ deck, bpm, currentTime, duration, anchor, snap, playable, onAnchor, onSnap, onSeek, onJump }: Props) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const origin = validGridAnchor(anchor, duration);
  const position = gridPosition(currentTime, bpm, origin);
  const apply = async (value: number | null | "playhead") => {
    if (saving) return;
    setSaving(true);
    try { setMessage(await onAnchor(value)); }
    catch { setMessage("Could not save this grid. Try again."); }
    finally { setSaving(false); }
  };
  return <div className="grid-controls">
    <div className="grid-position">
      <span>MANUAL GRID · 4/4 · 8-BAR PHRASES</span>
      <strong>{!position ? "Find your first downbeat" : position.beforeAnchor ? "Before grid start" : `Phrase ${position.phrase} · Bar ${position.bar}`}</strong>
      <div className="grid-beat-lights" aria-label={position && !position.beforeAnchor ? `Beat ${position.beat} of 4` : "No active beat"}>{[1, 2, 3, 4].map((beat) => <i key={beat} className={position && !position.beforeAnchor && position.beat === beat ? "lit" : ""}>{beat}</i>)}</div>
      <div className="grid-phrase-bars" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} className={position && !position.beforeAnchor && position.bar === index + 1 ? "lit" : ""} />)}</div>
      <small>{bpm} source BPM · playhead {currentTime.toFixed(3)}s</small>
    </div>
    <p className="grid-help">Set the track’s BPM in Tempo first. Seek or listen for a downbeat, then mark it as beat 1. This grid is manual—not detected song structure.</p>
    <label className="grid-scrub">Position in track<input aria-label={`Deck ${deck} grid playhead`} type="range" min="0" max={duration || 1} step="0.01" value={Math.min(currentTime, duration || 1)} disabled={!playable || !duration} onChange={(event) => onSeek(Number(event.target.value))} /></label>
    <button className="grid-set-anchor" disabled={!playable || !duration || saving} onClick={() => void apply("playhead")}>Set beat 1 here</button>
    <div className="grid-anchor-row"><span>{origin === null ? "No anchor saved" : `Anchor ${origin.toFixed(3)}s`}</span><button disabled={origin === null || saving} onClick={() => void apply(null)}>Clear grid</button></div>
    <div className="grid-nudge" role="group" aria-label={`Deck ${deck} grid adjustment`}>
      <button disabled={origin === null || origin < 0.01 || saving} onClick={() => void apply(Number(((origin ?? 0) - 0.01).toFixed(6)))}>Grid −10 ms</button>
      <button disabled={origin === null || origin + 0.01 >= duration || saving} onClick={() => void apply(Number(((origin ?? 0) + 0.01).toFixed(6)))}>Grid +10 ms</button>
    </div>
    <button className="grid-snap" disabled={origin === null || !position} aria-pressed={snap && origin !== null} onClick={onSnap}>{snap && origin !== null ? "Snap ON" : "Snap OFF"} · new cues & loop starts</button>
    <div className="grid-navigation" role="group" aria-label={`Deck ${deck} grid navigation`}>
      {([[-1, 4, "Previous bar"], [1, 4, "Next bar"], [-1, 32, "Previous phrase"], [1, 32, "Next phrase"]] as const).map(([direction, beats, label]) => <button key={label} disabled={!playable || gridJumpTarget(currentTime, bpm, origin, duration, direction, beats) === null} onClick={() => onJump(direction, beats)}>{label}</button>)}
    </div>
    <p className="grid-help">Navigation exits loops. Snap only places new hot cues and beat-loop starts on the nearest grid beat; it does not delay playback or move saved cues. Grid edits exit loops on every deck holding this track.</p>
    <p className="grid-feedback" role="status">{message || "Local-track anchors save on this device. Demo edits last for this session."}</p>
  </div>;
}
