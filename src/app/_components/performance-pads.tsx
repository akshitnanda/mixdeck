"use client";

import { useState } from "react";

type Props = {
  deck: string;
  playing: boolean;
  playable: boolean;
  hotCues: Array<number | null>;
  loop: { enabled: boolean; beats: number };
  onToggle: () => void;
  onCue: (index: number, clear: boolean) => void;
  onLoop: (beats: number) => void;
  onJump: (beats: number) => void;
  onReleaseLoop: () => void;
};

const timestamp = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;

export function PerformancePads({ deck, playing, playable, hotCues, loop, onToggle, onCue, onLoop, onJump, onReleaseLoop }: Props) {
  const [bank, setBank] = useState("cues");
  const [clearing, setClearing] = useState(false);

  return (
    <div className="performance-pads">
      <div className="pad-toolbar">
        <div className="pad-bank-switch" role="group" aria-label="Performance bank">
          <button aria-pressed={bank === "cues"} onClick={() => { setBank("cues"); setClearing(false); }}>Hot cues</button>
          <button aria-pressed={bank === "loops"} onClick={() => { setBank("loops"); setClearing(false); }}>Loops & jumps</button>
        </div>
        <button className="pad-play" disabled={!playable} onClick={onToggle} aria-label={`${playing ? "Pause" : "Play"} deck ${deck} from pads`}>{playing ? "Pause" : "Play"}</button>
      </div>
      {bank === "cues" ? (
        <>
          <div className="pad-bank-heading">
            <p id={`pad-hint-${deck}`}>{clearing ? "Tap a saved cue to clear it." : "Tap an empty pad to save. Tap a saved pad to jump."}</p>
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
      ) : (
        <>
          <div className="pad-bank-heading">
            <p>{loop.enabled ? `${loop.beats}-beat loop active` : "Choose a loop length, or jump by beats."}</p>
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
    </div>
  );
}
