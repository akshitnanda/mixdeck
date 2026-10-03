"use client";

import { useState } from "react";
import { TempoControls } from "./tempo-controls";
import { BeatGridControls } from "./beat-grid-controls";

type Props = {
  deck: string;
  playing: boolean;
  playable: boolean;
  trackId: string;
  bpm: number;
  rate: number;
  currentTime: number;
  duration: number;
  gridAnchor?: number | null;
  snapToGrid: boolean;
  onGridAnchor: (value: number | null | "playhead") => Promise<string>;
  onGridSnap: () => void;
  onGridSeek: (target: number) => void;
  onGridJump: (direction: -1 | 1, beats: 4 | 32) => void;
  onRate: (rate: number) => void;
  onSync: () => void;
  onBpm: (bpm: number) => Promise<string>;
  hotCues: Array<number | null>;
  loop: { enabled: boolean; beats: number };
  onToggle: () => void;
  onCue: (index: number, clear: boolean) => void;
  onLoop: (beats: number) => void;
  onJump: (beats: number) => void;
  onReleaseLoop: () => void;
  feedback: string;
};

const timestamp = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;

export function PerformancePads({ deck, playing, playable, trackId, bpm, rate, currentTime, duration, gridAnchor, snapToGrid, onGridAnchor, onGridSnap, onGridSeek, onGridJump, onRate, onSync, onBpm, hotCues, loop, onToggle, onCue, onLoop, onJump, onReleaseLoop, feedback }: Props) {
  const [bank, setBank] = useState("cues");
  const [clearing, setClearing] = useState(false);

  return (
    <div className="performance-pads">
      <div className="pad-toolbar">
        <div className="pad-bank-switch" role="group" aria-label="Performance bank">
          <button aria-pressed={bank === "cues"} onClick={() => { setBank("cues"); setClearing(false); }}>Hot cues</button>
          <button aria-pressed={bank === "loops"} onClick={() => { setBank("loops"); setClearing(false); }}>Loops & jumps</button>
          <button aria-pressed={bank === "tempo"} onClick={() => { setBank("tempo"); setClearing(false); }}>Tempo</button>
          <button aria-pressed={bank === "grid"} onClick={() => { setBank("grid"); setClearing(false); }}>Beat grid</button>
        </div>
        <button className="pad-play" disabled={!playable} onClick={onToggle} aria-label={`${playing ? "Pause" : "Play"} deck ${deck} from pads`}>{playing ? "Pause" : "Play"}</button>
      </div>
      {bank === "cues" ? (
        <>
          <div className="pad-bank-heading">
            <p id={`pad-hint-${deck}`}>{clearing ? "Tap a saved cue to clear it." : snapToGrid ? "Snap ON: new cues land on the nearest grid beat. Saved cues stay put." : "Tap an empty pad to save. Tap a saved pad to jump."}</p>
            <button aria-pressed={clearing} onClick={() => setClearing((value) => !value)}>{clearing ? "Done clearing" : "Clear cues"}</button>
          </div>
          <div className={`pad-grid ${clearing ? "clearing" : ""}`} role="group" aria-label={`Deck ${deck} cue pads`} aria-describedby={`pad-hint-${deck}`}>
            {hotCues.map((cue, index) => (
              <button key={index} className={cue === null ? "" : "saved"} disabled={!playable || (clearing && cue === null)}
                aria-label={`${clearing ? "Clear" : cue === null ? "Save" : "Jump to"} cue ${index + 1} on deck ${deck}`}
                onClick={() => onCue(index, clearing)}>
                <strong>{index + 1}</strong>
                <span>{cue === null ? "Set cue" : clearing ? "Clear" : timestamp(cue)}</span>
              </button>
            ))}
          </div>
        </>
      ) : bank === "grid" ? (
        <BeatGridControls key={trackId} deck={deck} bpm={bpm} currentTime={currentTime} duration={duration} anchor={gridAnchor} snap={snapToGrid} playable={playable} onAnchor={onGridAnchor} onSnap={onGridSnap} onSeek={onGridSeek} onJump={onGridJump} />
      ) : bank === "tempo" ? (
        <TempoControls key={trackId} deck={deck} bpm={bpm} rate={rate} onRate={onRate} onSync={onSync} onBpm={onBpm} />
      ) : (
        <>
          <div className="pad-bank-heading">
            <p>{loop.enabled ? `${loop.beats}-beat loop active` : snapToGrid ? "Snap ON: beat loops start on the nearest grid beat." : "Choose a loop length, or jump by beats."}</p>
            <button disabled={!loop.enabled} onClick={onReleaseLoop}>Exit loop</button>
          </div>
          <div className="pad-grid loop-pad-grid" role="group" aria-label={`Deck ${deck} loop pads`}>
            {[1, 2, 4, 8, 16, 32].map((beats) => (
              <button key={beats} disabled={!playable} aria-pressed={loop.enabled && loop.beats === beats}
                onClick={() => onLoop(beats)} aria-label={`${beats} beat loop on deck ${deck}`}>
                <strong>{beats}</strong><span>{beats === 1 ? "beat" : "beats"}</span>
              </button>
            ))}
          </div>
          <div className="pad-jumps" role="group" aria-label={`Deck ${deck} beat jumps`}>
            {[-16, -4, 4, 16].map((beats) => <button key={beats} disabled={!playable} onClick={() => onJump(beats)} aria-label={`Jump ${Math.abs(beats)} beats ${beats < 0 ? "back" : "forward"} on deck ${deck}`}>{beats > 0 ? "+" : ""}{beats}</button>)}
          </div>
        </>
      )}
      {(bank === "loops" || bank === "cues") && <p className="pad-feedback">{feedback}</p>}
    </div>
  );
}
