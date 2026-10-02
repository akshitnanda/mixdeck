"use client";

import { getMixCompatibility, type MixTrackProfile } from "../_lib/mix-compatibility";
import { transitionDurationMs } from "../_lib/transition";

type Deck = { track: MixTrackProfile & { title: string }; rate: number; playing: boolean };
type Props = {
  decks: Record<"A" | "B", Deck>;
  beats: number;
  running: "A" | "B" | null;
  position: number;
  onBeats: (beats: number) => void;
  onSync: (deck: "A" | "B") => void;
  onFade: (deck: "A" | "B") => void;
  onPosition: (value: number) => void;
  onStop: () => void;
};

export function TransitionLab({ decks, beats, running, position, onBeats, onSync, onFade, onPosition, onStop }: Props) {
  const tempoA = decks.A.track.bpm * decks.A.rate;
  const tempoB = decks.B.track.bpm * decks.B.rate;
  const match = getMixCompatibility({ ...decks.A.track, bpm: tempoA }, { ...decks.B.track, bpm: tempoB });
  const ready = decks.A.playing && decks.B.playing;
  return (
    <div className="dialog-content transition-lab">
      <p className="dialog-lede">Build the lift. Land the handoff.</p>
      <div className="blend-decks">
        {(["A", "B"] as const).map((id) => <article key={id} className={`blend-deck blend-${id.toLowerCase()}`}>
          <span>DECK {id} · {decks[id].playing ? "PLAYING" : "PAUSED"}</span>
          <strong title={decks[id].track.title}>{decks[id].track.title}</strong>
          <p><b>{(decks[id].track.bpm * decks[id].rate).toFixed(1)}</b> BPM <span>· {decks[id].track.key}</span></p>
          <button disabled={Boolean(running)} onClick={() => onSync(id)}>Match {id} to {id === "A" ? "B" : "A"}</button>
        </article>)}
      </div>
      <div className="blend-evidence"><strong>{Math.abs(tempoA - tempoB) < 0.1 ? "Tempo matched" : `${Math.abs(tempoA - tempoB).toFixed(1)} BPM apart`}</strong><span>{match.keyLabel} · {match.energyLabel}</span></div>
      <p className="blend-note">Key guidance uses track metadata, not a guarantee of harmony. Match tempo, then align your cues by ear.</p>
      <fieldset className="blend-length"><legend>FADE LENGTH</legend>{[4, 8, 16].map((value) => <button key={value} aria-pressed={beats === value} disabled={Boolean(running)} onClick={() => onBeats(value)}>{value} beats</button>)}</fieldset>
      <div className="blend-actions">
        {(["A", "B"] as const).map((id) => {
          const from = decks[id === "A" ? "B" : "A"];
          const duration = transitionDurationMs(beats, from.track.bpm, from.rate);
          return <button key={id} className={`blend-to-${id.toLowerCase()}`} disabled={!ready || Boolean(running) || duration === null} onClick={() => onFade(id)}>Fade to {id}<small>{duration === null ? "Check BPM" : `${(duration / 1000).toFixed(1)} seconds`}</small></button>;
        })}
      </div>
      <div className="blend-status" role="status">{running ? `Blending to Deck ${running} · ${beats} beats` : ready ? "Both decks ready. Choose where to take the mix." : "Start both decks before fading. Nothing starts automatically."}</div>
      <label className="blend-position">MANUAL CROSSFADER <span>A {Math.round((1 - position) * 100)} / B {Math.round(position * 100)}</span><input aria-label="Transition manual crossfader" type="range" min="0" max="1" step="0.01" value={position} onPointerDown={onStop} onChange={(event) => onPosition(Number(event.target.value))} /></label>
      <div className="blend-manual"><button onClick={() => onPosition(0.5)}>Center mix</button><button onClick={onStop}>Take manual control</button></div>
      <p className="blend-note">Equal-power fade starts now, timed from the outgoing deck’s current BPM. No beat-grid or phrase alignment. Both decks keep playing afterward. Closing this panel keeps the fade running; moving the fader takes over immediately.</p>
    </div>
  );
}
