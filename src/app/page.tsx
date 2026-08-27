"use client";

import {
  AudioLines,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Disc3,
  Download,
  ExternalLink,
  FastForward,
  FolderOpen,
  GripVertical,
  Heart,
  Library,
  ListMusic,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Radio,
  Repeat2,
  RotateCcw,
  Rewind,
  Search,
  Settings2,
  ShieldCheck,
  Shuffle,
  SkipBack,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Volume2,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { ChangeEvent, CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { analyzeAudioFile } from "./_lib/audio-analysis";
import { LIVE_CHANNEL_NAME, LIVE_STORAGE_KEY, type LiveSnapshot } from "./_lib/live-state";
import { readLocalCrate, storeLocalTracks, type StoredCrateTrack } from "./_lib/local-crate";

type DeckId = "A" | "B";
type WorkspaceView = "Mix" | "Queue" | "Record";
type SortMode = "recent" | "title" | "bpm";
type PanelView = "help" | "settings" | "profile" | "deck-A" | "deck-B" | null;
type FxName = "filter" | "delay" | "reverb" | "flanger" | "distortion" | "phaser" | "tremolo" | "compressor";
type FxState = Record<FxName, number>;

type Track = {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  duration: number;
  genre: string;
  energy: "Low" | "Medium" | "High";
  color: string;
  accent: string;
  url?: string;
  source: "MixDeck" | "Local";
};

type DeckState = {
  track: Track;
  playing: boolean;
  currentTime: number;
  volume: number;
  rate: number;
  eq: { high: number; mid: number; low: number };
  fx: FxState;
  loop: { enabled: boolean; beats: number; start: number; end: number };
  hotCues: Array<number | null>;
};

type AudioChain = {
  source: MediaElementAudioSourceNode;
  low: BiquadFilterNode;
  mid: BiquadFilterNode;
  high: BiquadFilterNode;
  filter: BiquadFilterNode;
  phaser: BiquadFilterNode;
  distortion: WaveShaperNode;
  compressor: DynamicsCompressorNode;
  tremolo: GainNode;
  tremoloLfo: OscillatorNode;
  tremoloDepth: GainNode;
  dry: GainNode;
  delay: DelayNode;
  feedback: GainNode;
  wet: GainNode;
  reverb: ConvolverNode;
  reverbWet: GainNode;
  flanger: DelayNode;
  flangerWet: GainNode;
  flangerLfo: OscillatorNode;
  flangerDepth: GainNode;
  gain: GainNode;
};

type RecordingResult = {
  url: string;
  name: string;
  duration: number;
  size: number;
  createdAt: number;
};

type SavedDeckState = Omit<DeckState, "track" | "playing"> & { trackId: string };

type SavedSet = {
  version: 1;
  savedAt: number;
  activeDeck: DeckId;
  crossfader: number;
  masterVolume: number;
  queue: string[];
  favorites: string[];
  decks: Record<DeckId, SavedDeckState>;
};

const SET_STORAGE_KEY = "mixdeck-saved-set";
const SORT_LABELS: Record<SortMode, string> = { recent: "Recently added", title: "Track title", bpm: "BPM" };
const FX_NAMES: FxName[] = ["filter", "delay", "reverb", "flanger", "distortion", "phaser", "tremolo", "compressor"];
const FX_LABELS: Record<FxName, string> = { filter: "Filter", delay: "Delay", reverb: "Reverb", flanger: "Flanger", distortion: "Drive", phaser: "Phaser", tremolo: "Tremolo", compressor: "Comp" };
const defaultFx = (): FxState => ({ filter: 0, delay: 0, reverb: 0, flanger: 0, distortion: 0, phaser: 0, tremolo: 0, compressor: 0 });

const BASE_TRACKS: Track[] = [
  {
    id: "neon-runner",
    title: "Neon Runner",
    artist: "MixDeck Labs",
    bpm: 128,
    key: "8A",
    duration: 24,
    genre: "Future House",
    energy: "High",
    color: "#182947",
    accent: "#67e8f9",
    source: "MixDeck",
  },
  {
    id: "afterglow",
    title: "Afterglow",
    artist: "MixDeck Labs",
    bpm: 122,
    key: "9A",
    duration: 24,
    genre: "Deep House",
    energy: "Medium",
    color: "#3a1739",
    accent: "#fb71cc",
    source: "MixDeck",
  },
  {
    id: "night-drive",
    title: "Night Drive",
    artist: "Astra Vale",
    bpm: 124,
    key: "6A",
    duration: 198,
    genre: "Progressive",
    energy: "Medium",
    color: "#142d2b",
    accent: "#5eead4",
    source: "MixDeck",
  },
  {
    id: "static-heart",
    title: "Static Heart",
    artist: "Nova Bloom",
    bpm: 130,
    key: "2A",
    duration: 214,
    genre: "Drum & Bass",
    energy: "High",
    color: "#38221a",
    accent: "#fbbf24",
    source: "MixDeck",
  },
  {
    id: "slow-motion",
    title: "Slow Motion",
    artist: "Lowlight",
    bpm: 110,
    key: "4B",
    duration: 176,
    genre: "Chill",
    energy: "Low",
    color: "#222039",
    accent: "#a78bfa",
    source: "MixDeck",
  },
  {
    id: "kinetic",
    title: "Kinetic",
    artist: "Parallel",
    bpm: 126,
    key: "8B",
    duration: 205,
    genre: "Electro House",
    energy: "High",
    color: "#263018",
    accent: "#bef264",
    source: "MixDeck",
  },
];

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
};

const HOT_CUE_COLORS = ["#21d8e8", "#ee4ca8", "#f4ae54", "#a6eb5e", "#8b7dff", "#ff6b6b", "#56e39f", "#e7db69"];

function makeImpulseResponse(context: AudioContext, variant: number) {
  const seconds = 1.65;
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  let seed = 7411 + variant * 1013;
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let frame = 0; frame < length; frame += 1) {
      seed = (seed * 16807) % 2147483647;
      const noise = (seed / 2147483647) * 2 - 1;
      const decay = Math.pow(1 - frame / length, 2.7);
      data[frame] = noise * decay * (channel === 0 ? 0.7 : 0.64);
    }
  }
  return impulse;
}

function makeDistortionCurve(amount: number) {
  if (amount <= 0) return null;
  const samples = 2048;
  const curve = new Float32Array(samples);
  const drive = 1 + amount * 160;
  for (let index = 0; index < samples; index += 1) {
    const input = index * 2 / (samples - 1) - 1;
    curve[index] = Math.tanh(input * drive) / Math.tanh(drive);
  }
  return curve;
}

function configureFx(chain: AudioChain | undefined, fx: FxState, bpm: number, rate: number) {
  if (!chain) return;
  if (fx.filter <= 0) {
    chain.filter.type = "lowpass";
    chain.filter.frequency.value = 20000 * Math.pow(0.0125, -fx.filter);
  } else {
    chain.filter.type = "highpass";
    chain.filter.frequency.value = 20 * Math.pow(250, fx.filter);
  }
  chain.filter.Q.value = 1.15;
  chain.delay.delayTime.value = Math.max(0.08, 30 / (bpm * rate));
  chain.feedback.gain.value = 0.2 + fx.delay * 0.48;
  chain.wet.gain.value = fx.delay * 0.52;
  chain.reverbWet.gain.value = fx.reverb * 0.5;
  chain.flangerWet.gain.value = fx.flanger * 0.46;
  chain.flangerDepth.gain.value = fx.flanger * 0.0032;
  chain.flangerLfo.frequency.value = 0.12 + fx.flanger * 0.72;
  chain.distortion.curve = makeDistortionCurve(fx.distortion);
  chain.phaser.frequency.value = fx.phaser > 0 ? 260 + fx.phaser * 2200 : 20000;
  chain.phaser.Q.value = fx.phaser > 0 ? 0.7 + fx.phaser * 7 : 0.0001;
  chain.tremolo.gain.value = 1 - fx.tremolo * 0.42;
  chain.tremoloDepth.gain.value = fx.tremolo * 0.42;
  chain.tremoloLfo.frequency.value = 3.2 + fx.tremolo * 5.8;
  chain.compressor.threshold.value = -4 - fx.compressor * 28;
  chain.compressor.ratio.value = 1 + fx.compressor * 11;
  chain.compressor.attack.value = 0.004 + fx.compressor * 0.02;
  chain.compressor.release.value = 0.12 + fx.compressor * 0.28;
  chain.dry.gain.value = 1 - Math.max(fx.delay, fx.reverb, fx.flanger) * 0.16;
}

function encodeWav(channels: [Float32Array[], Float32Array[]], sampleRate: number) {
  const frameCount = channels[0].reduce((total, chunk) => total + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + frameCount * 4);
  const view = new DataView(buffer);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + frameCount * 4, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, frameCount * 4, true);

  let writeOffset = 44;
  for (let chunkIndex = 0; chunkIndex < channels[0].length; chunkIndex += 1) {
    const left = channels[0][chunkIndex];
    const right = channels[1][chunkIndex] ?? left;
    for (let frame = 0; frame < left.length; frame += 1) {
      const leftSample = Math.max(-1, Math.min(1, left[frame]));
      const rightSample = Math.max(-1, Math.min(1, right[frame]));
      view.setInt16(writeOffset, leftSample < 0 ? leftSample * 32768 : leftSample * 32767, true);
      view.setInt16(writeOffset + 2, rightSample < 0 ? rightSample * 32768 : rightSample * 32767, true);
      writeOffset += 4;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

function makeDemoLoop(bpm: number, variant: number) {
  const sampleRate = 22050;
  const seconds = 24;
  const samples = sampleRate * seconds;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples * 2, true);

  const beat = 60 / bpm;
  const bassNotes = variant === 0 ? [55, 55, 65.41, 73.42] : [49, 61.74, 55, 73.42];
  let noise = 9182 + variant * 93;
  for (let i = 0; i < samples; i += 1) {
    const time = i / sampleRate;
    const beatIndex = Math.floor(time / beat);
    const beatPhase = time % beat;
    const halfBeatPhase = time % (beat / 2);
    const barBeat = beatIndex % 4;
    const kick = Math.sin(2 * Math.PI * (48 + 72 * Math.exp(-beatPhase * 24)) * beatPhase)
      * Math.exp(-beatPhase * 13) * (barBeat === 0 || barBeat === 2 ? 0.92 : 0.72);
    const snarePhase = beatPhase;
    noise = (noise * 16807) % 2147483647;
    const white = (noise / 2147483647) * 2 - 1;
    const snare = (barBeat === 1 || barBeat === 3) ? white * Math.exp(-snarePhase * 18) * 0.32 : 0;
    const hat = white * Math.exp(-halfBeatPhase * 48) * 0.085;
    const note = bassNotes[Math.floor(beatIndex / 2) % bassNotes.length];
    const bass = Math.sin(2 * Math.PI * note * time) * (1 - Math.exp(-beatPhase * 25))
      * Math.exp(-beatPhase * 1.8) * 0.34;
    const chordRoot = variant === 0 ? 220 : 196;
    const pulse = Math.sin(2 * Math.PI * chordRoot * time)
      + 0.45 * Math.sin(2 * Math.PI * chordRoot * 1.5 * time);
    const pad = pulse * (0.055 + 0.035 * Math.sin(2 * Math.PI * time / (beat * 8)));
    const fade = Math.min(1, time * 3, (seconds - time) * 3);
    const sample = Math.max(-1, Math.min(1, (kick + snare + hat + bass + pad) * fade * 0.72));
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  return URL.createObjectURL(new Blob([view], { type: "audio/wav" }));
}

function waveformValues(seed: string, count = 112) {
  let value = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Array.from({ length: count }, (_, index) => {
    value = (value * 9301 + 49297 + index) % 233280;
    const wave = Math.sin(index * 0.31) * 0.17 + Math.sin(index * 0.087) * 0.12;
    return Math.max(0.14, Math.min(0.98, value / 233280 * 0.68 + 0.2 + wave));
  });
}

function Cover({ track, small = false }: { track: Track; small?: boolean }) {
  return (
    <div
      className={`cover ${small ? "cover-small" : ""}`}
      style={{ "--cover-color": track.color, "--cover-accent": track.accent } as CSSProperties}
      aria-hidden="true"
    >
      <span className="cover-orbit" />
      <span className="cover-core" />
      <span className="cover-mark">M</span>
    </div>
  );
}

function Waveform({ deck, progress, onSwipe }: { deck: DeckState; progress: number; onSwipe: (direction: -1 | 1) => void }) {
  const values = useMemo(() => waveformValues(deck.track.id), [deck.track.id]);
  const touchStartX = useRef<number | null>(null);
  return (
    <div
      className="waveform"
      aria-label={`Waveform for ${deck.track.title}. Swipe left or right to jump four beats.`}
      onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < 44) return;
        onSwipe(end > start ? -1 : 1);
      }}
    >
      <div className="wave-overview">
        {values.slice(0, 64).map((height, index) => (
          <i key={index} style={{ height: `${(height * 100).toFixed(2)}%` }} />
        ))}
        <span className="overview-progress" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="wave-main">
        <div className="beat-grid" />
        {deck.loop.enabled && (
          <span
            className="loop-region"
            style={{
              left: `${Math.min(100, deck.loop.start / Math.max(1, deck.track.duration) * 100)}%`,
              width: `${Math.min(100, (deck.loop.end - deck.loop.start) / Math.max(1, deck.track.duration) * 100)}%`,
            }}
          />
        )}
        <div className="wave-bars">
          {values.map((height, index) => (
            <i
              key={index}
              className={index / values.length <= progress ? "played" : ""}
              style={{ height: `${(height * 100).toFixed(2)}%` }}
            />
          ))}
        </div>
        <div className="playhead"><span /></div>
        {deck.hotCues.map((cue, index) => cue === null ? null : (
          <div
            className="cue-marker"
            key={index}
            style={{
              "--cue-left": `${Math.min(98, cue / Math.max(1, deck.track.duration) * 100)}%`,
              "--cue-color": HOT_CUE_COLORS[index],
            } as CSSProperties}
          >{index + 1}</div>
        ))}
      </div>
    </div>
  );
}

function EqKnob({ label, value, onChange, accent }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  accent: string;
}) {
  const rotation = -135 + ((value + 12) / 24) * 270;
  return (
    <label className="eq-control">
      <span className="knob" style={{ "--rotation": `${rotation}deg`, "--knob-accent": accent } as CSSProperties}>
        <span className="knob-indicator" />
        <input
          aria-label={`${label} EQ, ${value} decibels`}
          type="range"
          min="-12"
          max="12"
          step="1"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </span>
      <b>{label}</b>
      <small>{value > 0 ? "+" : ""}{value}</small>
    </label>
  );
}

function Deck({ id, state, active, onFocus, onOptions, onToggle, onCue, onSeek, onVolume, onEq, onFx, onLoop, onLoopPoint, onBeatJump, onHotCue, onSync }: {
  id: DeckId;
  state: DeckState;
  active: boolean;
  onFocus: () => void;
  onOptions: () => void;
  onToggle: () => void;
  onCue: () => void;
  onSeek: (value: number) => void;
  onVolume: (value: number) => void;
  onEq: (band: keyof DeckState["eq"], value: number) => void;
  onFx: (effect: keyof DeckState["fx"], value: number) => void;
  onLoop: (beats: number) => void;
  onLoopPoint: (point: "in" | "out") => void;
  onBeatJump: (beats: number) => void;
  onHotCue: (index: number, clear: boolean) => void;
  onSync: () => void;
}) {
  const accent = id === "A" ? "var(--cyan)" : "var(--pink)";
  const duration = state.track.duration || 1;
  const progress = Math.min(1, state.currentTime / duration);
  return (
    <section className={`deck deck-${id.toLowerCase()} ${active ? "active-deck" : ""}`} onPointerDown={onFocus}>
      <div className="deck-heading">
        <span className="deck-label" style={{ "--deck-accent": accent } as CSSProperties}>DECK {id}</span>
        <div className="deck-status"><i className={state.playing ? "live" : ""} />{state.playing ? "LIVE" : "READY"}</div>
        <button className="icon-button" onClick={onOptions} aria-label={`Open options for deck ${id}`}><MoreHorizontal size={18} /></button>
      </div>

      <div className="track-identity">
        <Cover track={state.track} />
        <div className="track-copy">
          <span className="eyebrow">NOW {state.playing ? "PLAYING" : "LOADED"}</span>
          <h2>{state.track.title}</h2>
          <p>{state.track.artist}</p>
        </div>
        <div className="bpm-block">
          <strong>{Math.round(state.track.bpm * state.rate)}</strong>
          <span>BPM</span>
          <small>{state.track.key}</small>
        </div>
      </div>

      <Waveform deck={state} progress={progress} onSwipe={(direction) => onBeatJump(direction * 4)} />

      <div className="time-row">
        <span>{formatTime(state.currentTime)}</span>
        <input
          className="seek"
          aria-label={`Seek ${state.track.title}`}
          type="range"
          min="0"
          max={duration}
          step="0.01"
          value={Math.min(state.currentTime, duration)}
          onChange={(event) => onSeek(Number(event.target.value))}
          style={{ "--range-progress": `${progress * 100}%`, "--range-accent": accent } as CSSProperties}
        />
        <span>-{formatTime(Math.max(0, duration - state.currentTime))}</span>
      </div>

      <div className="deck-controls">
        <div className="transport">
          <button className="cue-button" onClick={onCue} aria-label={`Return deck ${id} to cue point`}>
            <SkipBack size={17} fill="currentColor" />
            <span>CUE</span>
          </button>
          <button
            className="play-button"
            onClick={onToggle}
            disabled={!state.track.url}
            aria-label={`${state.playing ? "Pause" : "Play"} deck ${id}`}
            style={{ "--play-accent": accent } as CSSProperties}
          >
            {state.playing ? <Pause size={25} fill="currentColor" /> : <Play size={25} fill="currentColor" />}
          </button>
          <button className="sync-button" onClick={onSync} aria-label={`Sync deck ${id}`}>
            <Zap size={15} fill={state.rate !== 1 ? "currentColor" : "none"} />
            <span>SYNC</span>
          </button>
        </div>

        <div className="eq-bank">
          {(["high", "mid", "low"] as const).map((band) => (
            <EqKnob key={band} label={band.toUpperCase()} value={state.eq[band]} onChange={(value) => onEq(band, value)} accent={accent} />
          ))}
        </div>

        <label className="volume-control">
          <Volume2 size={16} />
          <input
            aria-label={`Deck ${id} volume`}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.volume}
            onChange={(event) => onVolume(Number(event.target.value))}
            style={{ "--range-progress": `${state.volume * 100}%`, "--range-accent": accent } as CSSProperties}
          />
          <span>{Math.round(state.volume * 100)}</span>
        </label>
        <div className="deck-fx">
          <button
            className={state.fx.filter !== 0 ? "active" : ""}
            onClick={() => onFx("filter", state.fx.filter === 0 ? -0.48 : 0)}
            aria-label={`${state.fx.filter === 0 ? "Enable" : "Disable"} deck ${id} filter`}
          >
            <SlidersHorizontal size={13} />FILTER
          </button>
          <input
            aria-label={`Deck ${id} filter`}
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={state.fx.filter}
            onChange={(event) => onFx("filter", Number(event.target.value))}
            style={{ "--fx-position": `${(state.fx.filter + 1) * 50}%`, "--fx-accent": accent } as CSSProperties}
          />
          <button
            className={state.fx.delay > 0 ? "active" : ""}
            onClick={() => onFx("delay", state.fx.delay > 0 ? 0 : 0.34)}
            aria-label={`${state.fx.delay > 0 ? "Disable" : "Enable"} deck ${id} delay`}
          >
            <Repeat2 size={13} />DELAY
          </button>
          <input
            aria-label={`Deck ${id} delay mix`}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.fx.delay}
            onChange={(event) => onFx("delay", Number(event.target.value))}
            style={{ "--fx-position": `${state.fx.delay * 100}%`, "--fx-accent": accent } as CSSProperties}
          />
          <button
            className={state.fx.reverb > 0 ? "active" : ""}
            onClick={() => onFx("reverb", state.fx.reverb > 0 ? 0 : 0.3)}
            aria-label={`${state.fx.reverb > 0 ? "Disable" : "Enable"} deck ${id} reverb`}
          >
            <Waves size={13} />REVERB
          </button>
          <input
            aria-label={`Deck ${id} reverb mix`}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.fx.reverb}
            onChange={(event) => onFx("reverb", Number(event.target.value))}
            style={{ "--fx-position": `${state.fx.reverb * 100}%`, "--fx-accent": accent } as CSSProperties}
          />
        </div>
        <div className="performance-strip">
          <div className="loop-bank">
            <span>LOOP</span>
            <button className={state.loop.start > 0 && !state.loop.enabled ? "marked" : ""} onClick={() => onLoopPoint("in")} aria-label={`Set manual loop in point on deck ${id}`}>IN</button>
            <button className={state.loop.enabled ? "active" : ""} onClick={() => onLoopPoint("out")} aria-label={`Set manual loop out point on deck ${id}`}>OUT</button>
            {[1, 2, 4, 8].map((beats) => (
              <button
                key={beats}
                className={state.loop.enabled && state.loop.beats === beats ? "active" : ""}
                onClick={() => onLoop(beats)}
                aria-label={`${state.loop.enabled && state.loop.beats === beats ? "Disable" : "Start"} ${beats} beat loop on deck ${id}`}
              >{beats}</button>
            ))}
          </div>
          <div className="beat-jump-bank">
            <span>JUMP</span>
            <button onClick={() => onBeatJump(-4)} aria-label={`Jump deck ${id} back 4 beats`}><Rewind size={11} />4</button>
            <button onClick={() => onBeatJump(4)} aria-label={`Jump deck ${id} forward 4 beats`}>4<FastForward size={11} /></button>
          </div>
          <div className="hot-cue-bank">
            <span>HOT CUE</span>
            {state.hotCues.map((cue, index) => (
              <button
                key={index}
                className={cue !== null ? "set" : ""}
                onClick={(event) => onHotCue(index, event.shiftKey)}
                aria-label={cue === null ? `Set hot cue ${index + 1} on deck ${id}` : `Trigger hot cue ${index + 1} on deck ${id}. Shift click to clear`}
                style={{ "--cue-color": HOT_CUE_COLORS[index] } as CSSProperties}
              >{index + 1}</button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VuMeter({ level }: { level: number }) {
  return (
    <div className="vu" aria-label={`Master level ${Math.round(level * 100)} percent`}>
      {Array.from({ length: 22 }, (_, index) => <i key={index} className={index / 22 < level ? "lit" : ""} />)}
    </div>
  );
}

export default function Home() {
  const [tracks, setTracks] = useState<Track[]>(BASE_TRACKS);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("Mix");
  const [performanceMode, setPerformanceMode] = useState(false);
  const [queue, setQueue] = useState<string[]>(["afterglow", "neon-runner"]);
  const [autoDj, setAutoDj] = useState(false);
  const [shuffleQueue, setShuffleQueue] = useState(false);
  const [repeatQueue, setRepeatQueue] = useState(false);
  const [decks, setDecks] = useState<Record<DeckId, DeckState>>({
    A: { track: BASE_TRACKS[0], playing: false, currentTime: 0, volume: 0.84, rate: 1, eq: { high: 0, mid: 0, low: 0 }, fx: defaultFx(), loop: { enabled: false, beats: 4, start: 0, end: 0 }, hotCues: Array(8).fill(null) },
    B: { track: BASE_TRACKS[1], playing: false, currentTime: 0, volume: 0.84, rate: 1, eq: { high: 0, mid: 0, low: 0 }, fx: defaultFx(), loop: { enabled: false, beats: 4, start: 0, end: 0 }, hotCues: Array(8).fill(null) },
  });
  const [activeDeck, setActiveDeck] = useState<DeckId>("A");
  const [crossfader, setCrossfader] = useState(0.5);
  const [masterVolume, setMasterVolume] = useState(0.78);
  const [masterLevel, setMasterLevel] = useState(0.05);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All tracks");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["afterglow"]));
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [crateDragActive, setCrateDragActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingHistory, setRecordingHistory] = useState<RecordingResult[]>([]);
  const [panel, setPanel] = useState<PanelView>(null);
  const [savedSet, setSavedSet] = useState<SavedSet | null>(null);
  const [notice, setNotice] = useState("Demo loops are generated locally — no network audio used.");
  const lastRecording = recordingHistory[0] ?? null;

  const audioA = useRef<HTMLAudioElement>(null);
  const audioB = useRef<HTMLAudioElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const chains = useRef<Partial<Record<DeckId, AudioChain>>>({});
  const masterGain = useRef<GainNode | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const recorderNode = useRef<ScriptProcessorNode | null>(null);
  const recordingActive = useRef(false);
  const recordingStartedAt = useRef(0);
  const recordingTimer = useRef<number | null>(null);
  const recordingBuffers = useRef<[Float32Array[], Float32Array[]]>([[], []]);
  const recordingUrls = useRef<string[]>([]);
  const animationFrame = useRef<number | null>(null);
  const crossfadeFrame = useRef<number | null>(null);
  const autoDjTimer = useRef<number | null>(null);
  const autoDjTransitioning = useRef(false);
  const queueDragIndex = useRef<number | null>(null);
  const shuffleCursor = useRef(0);
  const queueStorageHydrated = useRef(false);
  const bentDeck = useRef<DeckId | null>(null);
  const demoUrls = useRef<string[]>([]);
  const localTrackUrls = useRef<string[]>([]);
  const liveChannel = useRef<BroadcastChannel | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const crossfaderValue = useRef(crossfader);
  const queueState = useRef(queue);
  const trackState = useRef(tracks);
  const deckState = useRef(decks);
  const autoDjState = useRef(autoDj);
  const shuffleState = useRef(shuffleQueue);
  const repeatState = useRef(repeatQueue);
  const performanceActions = useRef<{
    toggle: () => void;
    cue: () => void;
    sync: () => void;
    hotCue: (index: number, clear: boolean) => void;
    adjustLoop: (direction: -1 | 1) => void;
    bend: (direction: -1 | 1) => void;
    releaseBend: () => void;
  }>({
    toggle: () => {},
    cue: () => {},
    sync: () => {},
    hotCue: () => {},
    adjustLoop: () => {},
    bend: () => {},
    releaseBend: () => {},
  });

  useEffect(() => {
    const first = makeDemoLoop(128, 0);
    const second = makeDemoLoop(122, 1);
    demoUrls.current = [first, second];
    const readyTimer = window.setTimeout(() => {
      setTracks((current) => current.map((track, index) => index < 2 ? { ...track, url: index === 0 ? first : second } : track));
      setDecks((current) => ({
        A: { ...current.A, track: { ...current.A.track, url: first } },
        B: { ...current.B, track: { ...current.B.track, url: second } },
      }));
    }, 0);
    return () => {
      window.clearTimeout(readyTimer);
      demoUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readLocalCrate()
      .then((storedTracks) => {
        if (cancelled || !storedTracks.length) return;
        const restored = storedTracks
          .sort((left, right) => right.lastModified - left.lastModified)
          .map((stored): Track => {
            const url = URL.createObjectURL(stored.file);
            localTrackUrls.current.push(url);
            return {
              id: stored.id,
              title: stored.title,
              artist: stored.artist,
              bpm: stored.bpm,
              key: stored.key,
              duration: stored.duration,
              genre: stored.genre,
              energy: stored.energy,
              color: stored.color,
              accent: stored.accent,
              url,
              source: "Local",
            };
          });
        setTracks((current) => [...restored, ...current.filter((track) => !restored.some((item) => item.id === track.id))]);
        setNotice(`${restored.length} saved local ${restored.length === 1 ? "track" : "tracks"} restored from your crate.`);
      })
      .catch(() => {
        if (!cancelled) setNotice("The persistent local crate is unavailable. Imports still work for this tab.");
      });
    return () => {
      cancelled = true;
      localTrackUrls.current.forEach((url) => URL.revokeObjectURL(url));
      localTrackUrls.current = [];
    };
  }, []);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const storedQueue = JSON.parse(window.localStorage.getItem("mixdeck-queue") ?? "null") as unknown;
        if (Array.isArray(storedQueue) && storedQueue.every((trackId) => typeof trackId === "string")) {
          queueState.current = storedQueue;
          setQueue(storedQueue);
        }
        const storedSet = JSON.parse(window.localStorage.getItem(SET_STORAGE_KEY) ?? "null") as SavedSet | null;
        if (storedSet?.version === 1 && typeof storedSet.savedAt === "number") setSavedSet(storedSet);
      } catch {
        window.localStorage.removeItem("mixdeck-queue");
        window.localStorage.removeItem(SET_STORAGE_KEY);
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!queueStorageHydrated.current) {
      queueStorageHydrated.current = true;
      return;
    }
    window.localStorage.setItem("mixdeck-queue", JSON.stringify(queue));
  }, [queue]);

  const filteredTracks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = tracks.filter((track) => {
      const matchesSearch = !query || `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(query);
      const matchesFilter = filter === "All tracks"
        || (filter === "Favorites" && favorites.has(track.id))
        || (filter === "Local files" && track.source === "Local")
        || filter === track.energy
        || filter === track.genre;
      return matchesSearch && matchesFilter;
    });
    return matches.sort((left, right) => {
      if (sortMode === "title") return left.title.localeCompare(right.title);
      if (sortMode === "bpm") return right.bpm - left.bpm;
      return tracks.indexOf(left) - tracks.indexOf(right);
    });
  }, [favorites, filter, search, sortMode, tracks]);

  const queueTracks = useMemo(() => queue
    .map((trackId) => tracks.find((track) => track.id === trackId))
    .filter((track): track is Track => Boolean(track)), [queue, tracks]);

  useEffect(() => {
    crossfaderValue.current = crossfader;
    queueState.current = queue;
    trackState.current = tracks;
    deckState.current = decks;
    autoDjState.current = autoDj;
    shuffleState.current = shuffleQueue;
    repeatState.current = repeatQueue;
  }, [autoDj, crossfader, decks, queue, repeatQueue, shuffleQueue, tracks]);

  useEffect(() => {
    liveChannel.current = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(LIVE_CHANNEL_NAME);
    return () => {
      liveChannel.current?.close();
      liveChannel.current = null;
    };
  }, []);

  useEffect(() => {
    let liveDeck: DeckId = activeDeck;
    if (decks.A.playing !== decks.B.playing) liveDeck = decks.A.playing ? "A" : "B";
    else if (decks.A.playing && decks.B.playing) liveDeck = crossfader <= 0.5 ? "A" : "B";
    const state = decks[liveDeck];
    const snapshot: LiveSnapshot = {
      deck: liveDeck,
      title: state.track.title,
      artist: state.track.artist,
      bpm: Math.round(state.track.bpm * state.rate),
      key: state.track.key,
      currentTime: state.currentTime,
      duration: state.track.duration || 1,
      playing: state.playing,
      accent: state.track.accent,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(snapshot));
    liveChannel.current?.postMessage(snapshot);
  }, [activeDeck, crossfader, decks]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setPerformanceMode(false);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const left = Math.cos(crossfader * Math.PI / 2);
    const right = Math.sin(crossfader * Math.PI / 2);
    if (chains.current.A) chains.current.A.gain.gain.value = decks.A.volume * left;
    if (chains.current.B) chains.current.B.gain.gain.value = decks.B.volume * right;
    if (masterGain.current) masterGain.current.gain.value = masterVolume;
  }, [crossfader, decks.A.volume, decks.B.volume, masterVolume]);

  useEffect(() => {
    const chainA = chains.current.A;
    const chainB = chains.current.B;
    if (chainA) {
      chainA.high.gain.value = decks.A.eq.high;
      chainA.mid.gain.value = decks.A.eq.mid;
      chainA.low.gain.value = decks.A.eq.low;
    }
    if (chainB) {
      chainB.high.gain.value = decks.B.eq.high;
      chainB.mid.gain.value = decks.B.eq.mid;
      chainB.low.gain.value = decks.B.eq.low;
    }
  }, [decks.A.eq, decks.B.eq]);

  useEffect(() => {
    configureFx(chains.current.A, decks.A.fx, decks.A.track.bpm, decks.A.rate);
    configureFx(chains.current.B, decks.B.fx, decks.B.track.bpm, decks.B.rate);
  }, [decks.A.fx, decks.A.track.bpm, decks.A.rate, decks.B.fx, decks.B.track.bpm, decks.B.rate]);

  const initAudio = async () => {
    if (!audioContext.current) {
      const context = new AudioContext({ latencyHint: "interactive" });
      const output = context.createGain();
      const meter = context.createAnalyser();
      meter.fftSize = 256;
      output.connect(meter);
      meter.connect(context.destination);
      const recorder = context.createScriptProcessor(4096, 2, 2);
      const recorderSilence = context.createGain();
      recorderSilence.gain.value = 0;
      output.connect(recorder);
      recorder.connect(recorderSilence).connect(context.destination);
      recorder.onaudioprocess = (event) => {
        if (!recordingActive.current) return;
        const left = event.inputBuffer.getChannelData(0);
        const right = event.inputBuffer.numberOfChannels > 1 ? event.inputBuffer.getChannelData(1) : left;
        recordingBuffers.current[0].push(new Float32Array(left));
        recordingBuffers.current[1].push(new Float32Array(right));
      };
      masterGain.current = output;
      analyser.current = meter;
      recorderNode.current = recorder;
      audioContext.current = context;

      const elements: Record<DeckId, HTMLAudioElement | null> = { A: audioA.current, B: audioB.current };
      (["A", "B"] as const).forEach((id) => {
        const element = elements[id];
        if (!element) return;
        const source = context.createMediaElementSource(element);
        const low = context.createBiquadFilter();
        low.type = "lowshelf";
        low.frequency.value = 250;
        const mid = context.createBiquadFilter();
        mid.type = "peaking";
        mid.frequency.value = 1200;
        mid.Q.value = 0.7;
        const high = context.createBiquadFilter();
        high.type = "highshelf";
        high.frequency.value = 4200;
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 20000;
        const phaser = context.createBiquadFilter();
        phaser.type = "allpass";
        phaser.frequency.value = 20000;
        phaser.Q.value = 0.0001;
        const distortion = context.createWaveShaper();
        distortion.oversample = "4x";
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -4;
        compressor.ratio.value = 1;
        const tremolo = context.createGain();
        tremolo.gain.value = 1;
        const tremoloLfo = context.createOscillator();
        tremoloLfo.type = "sine";
        tremoloLfo.frequency.value = 4;
        const tremoloDepth = context.createGain();
        tremoloDepth.gain.value = 0;
        tremoloLfo.connect(tremoloDepth).connect(tremolo.gain);
        tremoloLfo.start();
        const dry = context.createGain();
        const delay = context.createDelay(2);
        const feedback = context.createGain();
        feedback.gain.value = 0.2;
        const wet = context.createGain();
        wet.gain.value = 0;
        const reverb = context.createConvolver();
        reverb.buffer = makeImpulseResponse(context, id === "A" ? 0 : 1);
        const reverbWet = context.createGain();
        reverbWet.gain.value = 0;
        const flanger = context.createDelay(0.03);
        flanger.delayTime.value = 0.004;
        const flangerWet = context.createGain();
        flangerWet.gain.value = 0;
        const flangerLfo = context.createOscillator();
        flangerLfo.type = "sine";
        flangerLfo.frequency.value = 0.3;
        const flangerDepth = context.createGain();
        flangerDepth.gain.value = 0;
        flangerLfo.connect(flangerDepth).connect(flanger.delayTime);
        flangerLfo.start();
        const gain = context.createGain();
        source.connect(low).connect(mid).connect(high).connect(filter).connect(phaser).connect(distortion).connect(compressor).connect(tremolo);
        tremolo.connect(dry).connect(gain);
        tremolo.connect(delay).connect(wet).connect(gain);
        delay.connect(feedback).connect(delay);
        tremolo.connect(reverb).connect(reverbWet).connect(gain);
        tremolo.connect(flanger).connect(flangerWet).connect(gain);
        gain.connect(output);
        chains.current[id] = { source, low, mid, high, filter, phaser, distortion, compressor, tremolo, tremoloLfo, tremoloDepth, dry, delay, feedback, wet, reverb, reverbWet, flanger, flangerWet, flangerLfo, flangerDepth, gain };
        configureFx(chains.current[id], deckState.current[id].fx, deckState.current[id].track.bpm, deckState.current[id].rate);
      });
      const left = Math.cos(crossfader * Math.PI / 2);
      const right = Math.sin(crossfader * Math.PI / 2);
      chains.current.A!.gain.gain.value = decks.A.volume * left;
      chains.current.B!.gain.gain.value = decks.B.volume * right;
      output.gain.value = masterVolume;

      const data = new Uint8Array(meter.fftSize);
      let lastUpdate = 0;
      const updateMeter = (timestamp: number) => {
        meter.getByteTimeDomainData(data);
        if (timestamp - lastUpdate > 70) {
          let sum = 0;
          data.forEach((sample) => { const normalized = (sample - 128) / 128; sum += normalized * normalized; });
          setMasterLevel(Math.min(1, Math.sqrt(sum / data.length) * 3.4));
          lastUpdate = timestamp;
        }
        animationFrame.current = requestAnimationFrame(updateMeter);
      };
      animationFrame.current = requestAnimationFrame(updateMeter);
    }
    if (audioContext.current.state === "suspended") await audioContext.current.resume();
  };

  useEffect(() => () => {
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    if (crossfadeFrame.current) cancelAnimationFrame(crossfadeFrame.current);
    if (autoDjTimer.current) window.clearTimeout(autoDjTimer.current);
    if (recordingTimer.current) window.clearInterval(recordingTimer.current);
    recordingActive.current = false;
    recorderNode.current?.disconnect();
    recordingUrls.current.forEach((url) => URL.revokeObjectURL(url));
    void audioContext.current?.close();
  }, []);

  const updateDeck = (id: DeckId, update: Partial<DeckState>) => {
    setDecks((current) => {
      const next = { ...current, [id]: { ...current[id], ...update } };
      deckState.current = next;
      return next;
    });
  };

  const saveSet = () => {
    const serializeDeck = (state: DeckState): SavedDeckState => {
      const { track, playing: _playing, ...rest } = state;
      void _playing;
      return { ...rest, trackId: track.id };
    };
    const snapshot: SavedSet = {
      version: 1,
      savedAt: Date.now(),
      activeDeck,
      crossfader,
      masterVolume,
      queue: [...queue],
      favorites: [...favorites],
      decks: { A: serializeDeck(decks.A), B: serializeDeck(decks.B) },
    };
    window.localStorage.setItem(SET_STORAGE_KEY, JSON.stringify(snapshot));
    setSavedSet(snapshot);
    const hasLocalDeck = decks.A.track.source === "Local" || decks.B.track.source === "Local";
    setNotice(hasLocalDeck
      ? "Set saved. Local audio must be imported again after a browser restart."
      : "Set saved locally — deck controls, cues, queue, and levels are recoverable.");
  };

  const restoreSet = () => {
    if (!savedSet) return;
    const unavailable: string[] = [];
    const restoreDeck = (id: DeckId): DeckState => {
      const stored = savedSet.decks[id];
      const current = decks[id];
      if (!stored) return current;
      const { trackId, ...settings } = stored;
      const track = tracks.find((item) => item.id === trackId);
      if (!track) {
        unavailable.push(trackId);
        return { ...current, ...settings, fx: { ...defaultFx(), ...settings.fx }, playing: false };
      }
      return { ...current, ...settings, fx: { ...defaultFx(), ...settings.fx }, track, playing: false };
    };
    audioA.current?.pause();
    audioB.current?.pause();
    const restoredDecks = { A: restoreDeck("A"), B: restoreDeck("B") };
    deckState.current = restoredDecks;
    setDecks(restoredDecks);
    setActiveDeck(savedSet.activeDeck);
    setCrossfader(savedSet.crossfader);
    setMasterVolume(savedSet.masterVolume);
    const restoredQueue = savedSet.queue.filter((trackId) => tracks.some((track) => track.id === trackId));
    queueState.current = restoredQueue;
    setQueue(restoredQueue);
    setFavorites(new Set(savedSet.favorites.filter((trackId) => tracks.some((track) => track.id === trackId))));
    window.requestAnimationFrame(() => {
      (["A", "B"] as const).forEach((id) => {
        const element = id === "A" ? audioA.current : audioB.current;
        if (!element) return;
        element.playbackRate = restoredDecks[id].rate;
        element.currentTime = Math.max(0, Math.min(restoredDecks[id].currentTime, restoredDecks[id].track.duration || 0));
      });
    });
    setPanel(null);
    setNotice(unavailable.length
      ? "Set restored. Re-import local audio to recover missing deck files."
      : "Saved set restored — press play when you are ready.");
  };

  const clearSavedSet = () => {
    window.localStorage.removeItem(SET_STORAGE_KEY);
    setSavedSet(null);
    setNotice("Saved set removed from this browser.");
  };

  const resetDeck = (id: DeckId) => {
    const element = id === "A" ? audioA.current : audioB.current;
    element?.pause();
    if (element) {
      element.currentTime = 0;
      element.playbackRate = 1;
    }
    updateDeck(id, {
      playing: false,
      currentTime: 0,
      volume: 0.84,
      rate: 1,
      eq: { high: 0, mid: 0, low: 0 },
      fx: defaultFx(),
      loop: { enabled: false, beats: 4, start: 0, end: 0 },
      hotCues: Array(8).fill(null),
    });
    setPanel(null);
    setNotice(`Deck ${id} controls reset. The loaded track is unchanged.`);
  };

  const toggleDeck = async (id: DeckId) => {
    const element = id === "A" ? audioA.current : audioB.current;
    if (!element || !decks[id].track.url) return;
    await initAudio();
    element.playbackRate = decks[id].rate;
    if (element.paused) {
      try {
        await element.play();
        updateDeck(id, { playing: true });
      } catch {
        setNotice("Playback was blocked. Try pressing play once more.");
      }
    } else {
      element.pause();
      updateDeck(id, { playing: false });
    }
  };

  const addToQueue = (track: Track) => {
    if (queueState.current.includes(track.id)) {
      setNotice(`${track.title} is already in the queue.`);
      return;
    }
    const next = [...queueState.current, track.id];
    queueState.current = next;
    setQueue(next);
    setNotice(`${track.title} added to the queue.`);
  };

  const removeFromQueue = (index: number) => {
    const track = queueTracks[index];
    const next = queueState.current.filter((_, queueIndex) => queueIndex !== index);
    queueState.current = next;
    setQueue(next);
    if (track) setNotice(`${track.title} removed from the queue.`);
  };

  const moveQueueItem = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= queueState.current.length || to >= queueState.current.length) return;
    const next = [...queueState.current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    queueState.current = next;
    setQueue(next);
  };

  const startDeckWithTrack = async (id: DeckId, track: Track) => {
    const element = id === "A" ? audioA.current : audioB.current;
    if (!element || !track.url) {
      setNotice(`${track.title} is a catalog preview. Import audio before playing it.`);
      return false;
    }
    await initAudio();
    element.pause();
    const loadedState: Partial<DeckState> = {
      track,
      playing: false,
      currentTime: 0,
      rate: 1,
      loop: { enabled: false, beats: 4, start: 0, end: 0 },
      hotCues: Array(8).fill(null),
    };
    flushSync(() => updateDeck(id, loadedState));
    element.load();
    element.currentTime = 0;
    element.playbackRate = 1;
    try {
      await element.play();
      updateDeck(id, { playing: true });
      setActiveDeck(id);
      return true;
    } catch {
      setNotice("Playback was blocked. Press play on the loaded deck to continue.");
      return false;
    }
  };

  const pickNextQueuedTrack = (sourceTrack: Track) => {
    const candidates = queueState.current
      .map((trackId, index) => ({ track: trackState.current.find((item) => item.id === trackId), index }))
      .filter((candidate): candidate is { track: Track; index: number } => Boolean(candidate.track?.url));
    if (!candidates.length) return null;
    if (shuffleState.current) {
      const candidate = candidates[shuffleCursor.current % candidates.length];
      shuffleCursor.current += 1;
      return candidate;
    }
    const energyRank = { Low: 0, Medium: 1, High: 2 } as const;
    return candidates.reduce((best, candidate) => {
      const score = Math.abs(candidate.track.bpm - sourceTrack.bpm)
        + Math.abs(energyRank[candidate.track.energy] - energyRank[sourceTrack.energy]) * 8;
      const bestScore = Math.abs(best.track.bpm - sourceTrack.bpm)
        + Math.abs(energyRank[best.track.energy] - energyRank[sourceTrack.energy]) * 8;
      return score < bestScore ? candidate : best;
    });
  };

  const consumeQueuedTrack = (trackId: string) => {
    const current = [...queueState.current];
    const index = current.indexOf(trackId);
    if (index >= 0) current.splice(index, 1);
    if (repeatState.current) current.push(trackId);
    queueState.current = current;
    setQueue(current);
  };

  const animateCrossfade = (target: number, duration = 5200) => {
    if (crossfadeFrame.current) cancelAnimationFrame(crossfadeFrame.current);
    const start = crossfaderValue.current;
    let startedAt: number | null = null;
    const tick = (timestamp: number) => {
      if (startedAt === null) startedAt = timestamp;
      const progress = Math.min(1, (timestamp - startedAt) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      const value = start + (target - start) * eased;
      crossfaderValue.current = value;
      setCrossfader(value);
      if (progress < 1) crossfadeFrame.current = requestAnimationFrame(tick);
      else crossfadeFrame.current = null;
    };
    crossfadeFrame.current = requestAnimationFrame(tick);
  };

  const advanceAutoDj = async (fromId: DeckId) => {
    if (!autoDjState.current || autoDjTransitioning.current) return;
    const candidate = pickNextQueuedTrack(deckState.current[fromId].track);
    if (!candidate) {
      autoDjState.current = false;
      setAutoDj(false);
      setNotice("AutoDJ paused — add a playable track to the queue.");
      return;
    }
    autoDjTransitioning.current = true;
    const toId: DeckId = fromId === "A" ? "B" : "A";
    const started = await startDeckWithTrack(toId, candidate.track);
    if (!started) {
      autoDjTransitioning.current = false;
      return;
    }
    consumeQueuedTrack(candidate.track.id);
    animateCrossfade(toId === "A" ? 0 : 1);
    setNotice(`AutoDJ mixing into ${candidate.track.title} on Deck ${toId}.`);
    if (autoDjTimer.current) window.clearTimeout(autoDjTimer.current);
    autoDjTimer.current = window.setTimeout(() => {
      const source = fromId === "A" ? audioA.current : audioB.current;
      source?.pause();
      updateDeck(fromId, { playing: false });
      autoDjTransitioning.current = false;
      autoDjTimer.current = null;
    }, 5400);
  };

  const playQueuedNow = async (track: Track) => {
    const targetDeck: DeckId = deckState.current.A.playing && !deckState.current.B.playing ? "B" : activeDeck;
    const started = await startDeckWithTrack(targetDeck, track);
    if (started) {
      consumeQueuedTrack(track.id);
      crossfaderValue.current = targetDeck === "A" ? 0 : 1;
      setCrossfader(crossfaderValue.current);
      setNotice(`${track.title} playing from the queue on Deck ${targetDeck}.`);
    }
  };

  const toggleAutoDj = () => {
    const next = !autoDjState.current;
    autoDjState.current = next;
    setAutoDj(next);
    if (!next) {
      autoDjTransitioning.current = false;
      if (autoDjTimer.current) window.clearTimeout(autoDjTimer.current);
      if (crossfadeFrame.current) cancelAnimationFrame(crossfadeFrame.current);
      setNotice("AutoDJ paused. Manual deck control restored.");
      return;
    }
    const playingDeck = deckState.current.A.playing ? "A" : deckState.current.B.playing ? "B" : null;
    if (playingDeck) {
      setNotice("AutoDJ armed — the next compatible queue track will crossfade automatically.");
      return;
    }
    const candidate = pickNextQueuedTrack(deckState.current[activeDeck].track);
    if (!candidate) {
      autoDjState.current = false;
      setAutoDj(false);
      setNotice("Add a playable track before starting AutoDJ.");
      return;
    }
    void startDeckWithTrack(activeDeck, candidate.track).then((started) => {
      if (started) {
        consumeQueuedTrack(candidate.track.id);
        crossfaderValue.current = activeDeck === "A" ? 0 : 1;
        setCrossfader(crossfaderValue.current);
        setNotice(`AutoDJ started with ${candidate.track.title} on Deck ${activeDeck}.`);
      }
    });
  };

  const cueDeck = (id: DeckId) => {
    const element = id === "A" ? audioA.current : audioB.current;
    if (!element) return;
    element.pause();
    element.currentTime = 0;
    updateDeck(id, { playing: false, currentTime: 0, loop: { ...decks[id].loop, enabled: false } });
  };

  const seekDeck = (id: DeckId, value: number) => {
    const element = id === "A" ? audioA.current : audioB.current;
    if (element) element.currentTime = value;
    updateDeck(id, { currentTime: value });
  };

  const beatJumpDeck = (id: DeckId, beats: number) => {
    const element = id === "A" ? audioA.current : audioB.current;
    if (!element) return;
    const seconds = beats * (60 / (decks[id].track.bpm * decks[id].rate));
    const duration = element.duration || decks[id].track.duration;
    const nextTime = Math.max(0, Math.min(duration, element.currentTime + seconds));
    element.currentTime = nextTime;
    updateDeck(id, { currentTime: nextTime });
    setNotice(`Deck ${id} jumped ${Math.abs(beats)} beats ${beats < 0 ? "back" : "forward"}.`);
  };

  const toggleLoop = (id: DeckId, beats: number) => {
    const element = id === "A" ? audioA.current : audioB.current;
    if (!element) return;
    const currentLoop = decks[id].loop;
    if (currentLoop.enabled && currentLoop.beats === beats) {
      updateDeck(id, { loop: { ...currentLoop, enabled: false } });
      setNotice(`Deck ${id} loop released.`);
      return;
    }
    const beatDuration = 60 / (decks[id].track.bpm * decks[id].rate);
    const start = element.currentTime;
    const end = Math.min(element.duration || decks[id].track.duration, start + beatDuration * beats);
    updateDeck(id, { loop: { enabled: true, beats, start, end } });
    setNotice(`Deck ${id} looping ${beats} ${beats === 1 ? "beat" : "beats"}.`);
  };

  const setManualLoopPoint = (id: DeckId, point: "in" | "out") => {
    const element = id === "A" ? audioA.current : audioB.current;
    if (!element) return;
    const currentTime = element.currentTime;
    if (point === "in") {
      updateDeck(id, { loop: { ...decks[id].loop, enabled: false, start: currentTime, end: currentTime } });
      setNotice(`Deck ${id} loop IN set at ${formatTime(currentTime)}. Move forward and press OUT.`);
      return;
    }
    const start = decks[id].loop.start;
    if (currentTime <= start + 0.08) {
      setNotice(`Deck ${id} loop OUT must be after the IN point.`);
      return;
    }
    const beatDuration = 60 / (decks[id].track.bpm * decks[id].rate);
    const beats = Math.max(1, Math.round((currentTime - start) / beatDuration));
    updateDeck(id, { loop: { enabled: true, beats, start, end: currentTime } });
    setNotice(`Deck ${id} manual loop locked from ${formatTime(start)} to ${formatTime(currentTime)}.`);
  };

  const triggerHotCue = (id: DeckId, index: number, clear = false) => {
    const element = id === "A" ? audioA.current : audioB.current;
    if (!element) return;
    const existing = decks[id].hotCues[index];
    const nextCues = [...decks[id].hotCues];
    if (clear) {
      nextCues[index] = null;
      updateDeck(id, { hotCues: nextCues });
      setNotice(`Deck ${id} hot cue ${index + 1} cleared.`);
      return;
    }
    if (existing === null) {
      nextCues[index] = element.currentTime;
      updateDeck(id, { hotCues: nextCues });
      setNotice(`Deck ${id} hot cue ${index + 1} set at ${formatTime(element.currentTime)}.`);
    } else {
      element.currentTime = existing;
      updateDeck(id, { currentTime: existing });
      setNotice(`Deck ${id} jumped to hot cue ${index + 1}.`);
    }
  };

  const handleTimeUpdate = (id: DeckId, element: HTMLAudioElement) => {
    const loop = decks[id].loop;
    if (loop.enabled && element.currentTime >= loop.end) {
      element.currentTime = loop.start;
    }
    updateDeck(id, { currentTime: element.currentTime });
    const remaining = element.duration - element.currentTime;
    if (autoDjState.current && !loop.enabled && !element.paused && remaining > 0 && remaining <= 5.5) {
      void advanceAutoDj(id);
    }
  };

  const handleEnded = (id: DeckId) => {
    updateDeck(id, { playing: false, currentTime: 0 });
    if (autoDjState.current && !autoDjTransitioning.current) void advanceAutoDj(id);
  };

  const loadTrack = (id: DeckId, track: Track) => {
    if (!track.url) {
      setNotice("This catalog row is a product preview. Upload audio to make it playable.");
      return;
    }
    const element = id === "A" ? audioA.current : audioB.current;
    if (element) {
      element.pause();
      element.currentTime = 0;
    }
    updateDeck(id, {
      track,
      playing: false,
      currentTime: 0,
      rate: 1,
      loop: { enabled: false, beats: 4, start: 0, end: 0 },
      hotCues: Array(8).fill(null),
    });
    setActiveDeck(id);
    setNotice(`${track.title} loaded to Deck ${id}.`);
  };

  const syncDeck = (id: DeckId) => {
    const other: DeckId = id === "A" ? "B" : "A";
    const rate = Math.max(0.8, Math.min(1.25, decks[other].track.bpm / decks[id].track.bpm));
    const element = id === "A" ? audioA.current : audioB.current;
    if (element) element.playbackRate = rate;
    updateDeck(id, { rate });
    setNotice(`Deck ${id} tempo matched to ${decks[other].track.bpm} BPM.`);
  };

  useEffect(() => {
    performanceActions.current = {
      toggle: () => void toggleDeck(activeDeck),
      cue: () => cueDeck(activeDeck),
      sync: () => syncDeck(activeDeck),
      hotCue: (index, clear) => triggerHotCue(activeDeck, index, clear),
      adjustLoop: (direction) => {
        const steps = [1, 2, 4, 8];
        const current = decks[activeDeck].loop.enabled ? decks[activeDeck].loop.beats : 4;
        const currentIndex = Math.max(0, steps.indexOf(current));
        toggleLoop(activeDeck, steps[Math.max(0, Math.min(steps.length - 1, currentIndex + direction))]);
      },
      bend: (direction) => {
        const element = activeDeck === "A" ? audioA.current : audioB.current;
        if (!element) return;
        bentDeck.current = activeDeck;
        element.playbackRate = Math.max(0.8, Math.min(1.25, decks[activeDeck].rate + direction * 0.04));
      },
      releaseBend: () => {
        const id = bentDeck.current;
        if (!id) return;
        const element = id === "A" ? audioA.current : audioB.current;
        if (element) element.playbackRate = decks[id].rate;
        bentDeck.current = null;
      },
    };
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLibraryOpen(true);
        searchInput.current?.focus();
        return;
      }
      if (event.key === "Escape") {
        setPanel(null);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      const hotCueKey = event.code.match(/^Digit([1-8])$/)?.[1]
        ?? (/^[1-8]$/.test(event.key) ? event.key : null);
      if (event.code === "Space") {
        if (target?.matches("button, a")) return;
        event.preventDefault();
        performanceActions.current.toggle();
      } else if (event.key.toLowerCase() === "c") {
        performanceActions.current.cue();
      } else if (event.key.toLowerCase() === "f") {
        performanceActions.current.sync();
      } else if (hotCueKey) {
        performanceActions.current.hotCue(Number(hotCueKey) - 1, event.shiftKey);
      } else if (event.key === "[" || event.code === "BracketLeft") {
        performanceActions.current.adjustLoop(-1);
      } else if (event.key === "]" || event.code === "BracketRight") {
        performanceActions.current.adjustLoop(1);
      } else if (event.key === "-" || event.code === "Minus" || event.code === "NumpadSubtract") {
        performanceActions.current.bend(-1);
      } else if (event.key === "+" || event.code === "Equal" || event.code === "NumpadAdd") {
        performanceActions.current.bend(1);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (["-", "+"].includes(event.key) || ["Minus", "Equal", "NumpadSubtract", "NumpadAdd"].includes(event.code)) {
        performanceActions.current.releaseBend();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const stopRecording = () => {
    recordingActive.current = false;
    setRecording(false);
    if (recordingTimer.current) {
      window.clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    const duration = Math.max(0, (Date.now() - recordingStartedAt.current) / 1000);
    const frameCount = recordingBuffers.current[0].reduce((total, chunk) => total + chunk.length, 0);
    if (!frameCount) {
      setNotice("Recording stopped before audio reached the master bus.");
      return;
    }

    const wav = encodeWav(recordingBuffers.current, audioContext.current?.sampleRate ?? 44100);
    const url = URL.createObjectURL(wav);
    recordingUrls.current.push(url);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const result = { url, name: `mixdeck-${timestamp}.wav`, duration, size: wav.size, createdAt: Date.now() };
    setRecordingHistory((current) => {
      const next = [result, ...current];
      next.slice(10).forEach((recordingResult) => {
        URL.revokeObjectURL(recordingResult.url);
        recordingUrls.current = recordingUrls.current.filter((item) => item !== recordingResult.url);
      });
      return next.slice(0, 10);
    });
    setNotice(`Mix captured — ${formatTime(duration)} WAV ready to download.`);
  };

  const toggleRecording = async () => {
    if (recordingActive.current) {
      stopRecording();
      return;
    }

    await initAudio();
    recordingBuffers.current = [[], []];
    recordingStartedAt.current = Date.now();
    recordingActive.current = true;
    setRecordingSeconds(0);
    setRecording(true);
    setNotice("Recording the master output locally. Press Stop when your mix is done.");
    recordingTimer.current = window.setInterval(() => {
      setRecordingSeconds((Date.now() - recordingStartedAt.current) / 1000);
    }, 250);
  };

  const importLocalFiles = async (files: File[]) => {
    const audioFiles = files.filter((file) => file.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(file.name));
    if (!audioFiles.length) {
      setNotice("No supported audio files were found in that drop.");
      return;
    }
    const storedTracks: StoredCrateTrack[] = audioFiles.map((file, index) => ({
      id: `local-${file.name}-${file.lastModified}-${file.size}`,
      title: file.name.replace(/\.[^.]+$/, ""),
      artist: "Local upload",
      bpm: 120,
      key: "—",
      duration: 0,
      genre: "Local files",
      energy: "Medium",
      color: index % 2 === 0 ? "#15323a" : "#33213c",
      accent: index % 2 === 0 ? "#22d3ee" : "#e879f9",
      file,
      fileName: file.name,
      lastModified: file.lastModified,
    }));
    const additions = storedTracks.map((stored): Track => {
      const url = URL.createObjectURL(stored.file);
      localTrackUrls.current.push(url);
      return {
        id: stored.id,
        title: stored.title,
        artist: stored.artist,
        bpm: stored.bpm,
        key: stored.key,
        duration: stored.duration,
        genre: stored.genre,
        energy: stored.energy,
        color: stored.color,
        accent: stored.accent,
        url,
        source: "Local",
      };
    });
    setTracks((current) => [...additions, ...current.filter((track) => !additions.some((item) => item.id === track.id))]);
    setFilter("All tracks");
    setCrateDragActive(false);
    try {
      await storeLocalTracks(storedTracks);
      setNotice(`${additions.length} local ${additions.length === 1 ? "track" : "tracks"} saved. Analyzing musical key on-device…`);
    } catch {
      setNotice(`${additions.length} local ${additions.length === 1 ? "track" : "tracks"} added for this tab. Persistent storage was unavailable.`);
    }
    const analyzedLabels: string[] = [];
    for (const stored of storedTracks) {
      try {
        const analysis = await analyzeAudioFile(stored.file);
        const analyzed = { ...stored, duration: analysis.duration, key: analysis.key };
        setTracks((current) => current.map((track) => track.id === stored.id ? { ...track, duration: analysis.duration, key: analysis.key } : track));
        await storeLocalTracks([analyzed]);
        analyzedLabels.push(`${stored.title}: ${analysis.key} (${analysis.keyLabel})`);
      } catch {
        analyzedLabels.push(`${stored.title}: key unavailable`);
      }
    }
    setNotice(`Crate ready — ${analyzedLabels.join(" · ")}`);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length) void importLocalFiles(files);
    event.target.value = "";
  };

  const onMetadata = (id: DeckId, element: HTMLAudioElement) => {
    if (!Number.isFinite(element.duration)) return;
    setDecks((current) => ({ ...current, [id]: { ...current[id], track: { ...current[id].track, duration: element.duration } } }));
  };

  const togglePerformanceMode = () => {
    const next = !performanceMode;
    setPerformanceMode(next);
    setWorkspaceView("Mix");
    setLibraryOpen(false);
    if (next && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {
        setNotice("Performance layout enabled. Browser fullscreen was unavailable.");
      });
    } else if (!next && document.fullscreenElement) {
      void document.exitFullscreen();
    }
  };

  useEffect(() => {
    if (!performanceMode) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPerformanceMode(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [performanceMode]);

  return (
    <main className={`app-shell ${performanceMode ? "performance-mode" : ""}`}>
      <audio ref={audioA} src={decks.A.track.url} onTimeUpdate={(event) => handleTimeUpdate("A", event.currentTarget)} onLoadedMetadata={(event) => onMetadata("A", event.currentTarget)} onEnded={() => handleEnded("A")} />
      <audio ref={audioB} src={decks.B.track.url} onTimeUpdate={(event) => handleTimeUpdate("B", event.currentTarget)} onLoadedMetadata={(event) => onMetadata("B", event.currentTarget)} onEnded={() => handleEnded("B")} />

      <header className="topbar">
        <Link className="brand" href="/welcome" aria-label="MixDeck welcome page">
          <span className="brand-symbol"><Waves size={23} strokeWidth={2.7} /></span>
          <span>mixdeck<sup>BETA</sup></span>
        </Link>
        <nav className="workspace-tabs" aria-label="Workspace views">
          <button className={workspaceView === "Mix" ? "active" : ""} onClick={() => setWorkspaceView("Mix")}><SlidersHorizontal size={15} />Mix</button>
          <button className={workspaceView === "Queue" ? "active" : ""} onClick={() => setWorkspaceView("Queue")}><ListMusic size={15} />Queue <span className="count">{queue.length}</span></button>
          <button className={workspaceView === "Record" ? "active" : ""} onClick={() => setWorkspaceView("Record")}><Radio size={15} />Record</button>
        </nav>
        <div className="topbar-actions">
          <a className="overlay-link" href="/overlay?background=dark" target="_blank" rel="noreferrer" aria-label="Open stream overlay in a new tab"><ExternalLink size={14} />OBS</a>
          {lastRecording && !recording && (
            <a className="recording-download" href={lastRecording.url} download={lastRecording.name} aria-label={`Download ${formatTime(lastRecording.duration)} recording`}>
              <Download size={14} />WAV
            </a>
          )}
          <button className={`record-button ${recording ? "recording" : ""}`} onClick={() => void toggleRecording()} aria-label={recording ? "Stop recording" : "Start recording"}>
            <i />{recording ? `Stop ${formatTime(recordingSeconds)}` : "Record"}
          </button>
          <button className={`icon-button performance-toggle ${performanceMode ? "active" : ""}`} onClick={togglePerformanceMode} aria-label={performanceMode ? "Exit performance mode" : "Enter performance mode"} title={performanceMode ? "Exit performance mode" : "Performance mode"}>
            {performanceMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button className="icon-button" onClick={() => setPanel("help")} aria-label="Help and keyboard shortcuts"><CircleHelp size={18} /></button>
          <button className="icon-button" onClick={() => setPanel("settings")} aria-label="Local settings"><Settings2 size={18} /></button>
          <button className="profile-button" onClick={() => setPanel("profile")} aria-label="Open local DJ profile">AK</button>
        </div>
      </header>

      <div className="mobile-library-toggle"><button onClick={() => setLibraryOpen(!libraryOpen)}><Library size={17} />Music library<ChevronDown size={16} /></button></div>
      <nav className="mobile-workspace-tabs" aria-label="Mobile workspace views">
        <button className={workspaceView === "Mix" ? "active" : ""} onClick={() => setWorkspaceView("Mix")}><SlidersHorizontal size={15} />Mix</button>
        <button className={workspaceView === "Queue" ? "active" : ""} onClick={() => setWorkspaceView("Queue")}><ListMusic size={15} />Queue <span>{queue.length}</span></button>
        <button className={workspaceView === "Record" ? "active" : ""} onClick={() => setWorkspaceView("Record")}><Radio size={15} />Record</button>
      </nav>

      <div className="console-layout">
        <aside
          className={`library-panel ${libraryOpen ? "mobile-open" : ""} ${crateDragActive ? "drop-active" : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setCrateDragActive(true); }}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setCrateDragActive(true); }}
          onDragLeave={(event) => {
            if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
            setCrateDragActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setCrateDragActive(false);
            void importLocalFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <div className="crate-drop-overlay" aria-hidden={!crateDragActive}><Upload size={28} /><strong>Drop audio into your crate</strong><span>Files stay in this browser</span></div>
          <div className="library-heading">
            <div><span className="eyebrow">YOUR CRATE</span><h1>Music library</h1></div>
            <label className="upload-button"><Upload size={16} />Import<input type="file" accept="audio/*" multiple onChange={handleUpload} /></label>
          </div>
          <label className="search-box"><Search size={17} /><input ref={searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tracks or artists" /><kbd>Ctrl K</kbd></label>

          <nav className="library-nav" aria-label="Library categories">
            {[{ label: "All tracks", icon: Library }, { label: "Favorites", icon: Heart }, { label: "Local files", icon: FolderOpen }].map(({ label, icon: Icon }) => (
              <button key={label} className={filter === label ? "active" : ""} onClick={() => setFilter(label)}>
                <Icon size={16} fill={label === "Favorites" && filter === label ? "currentColor" : "none"} />{label}
                <span>{label === "All tracks" ? tracks.length : label === "Favorites" ? favorites.size : tracks.filter((track) => track.source === "Local").length}</span>
              </button>
            ))}
          </nav>

          <div className="filter-row">{["High", "Medium", "Low"].map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(filter === value ? "All tracks" : value)}>{value}</button>)}</div>

          <div className="track-list-heading"><span>{filteredTracks.length} TRACKS</span><button onClick={() => setSortMode((current) => current === "recent" ? "title" : current === "title" ? "bpm" : "recent")} aria-label={`Sort library. Current sort: ${SORT_LABELS[sortMode]}`}><ChevronDown size={14} />{SORT_LABELS[sortMode]}</button></div>
          <div className="track-list">
            {filteredTracks.map((track) => (
              <article className={`library-track ${decks.A.track.id === track.id || decks.B.track.id === track.id ? "loaded" : ""}`} key={track.id}>
                <Cover track={track} small />
                <div className="library-track-copy"><strong>{track.title}</strong><span>{track.artist}</span><small>{track.genre}</small></div>
                <div className="track-stats"><strong>{track.bpm}</strong><span>{track.key}</span></div>
                <button className={`favorite-button ${favorites.has(track.id) ? "favorite" : ""}`} onClick={() => setFavorites((current) => {
                  const next = new Set(current);
                  if (next.has(track.id)) next.delete(track.id); else next.add(track.id);
                  return next;
                })} aria-label={`${favorites.has(track.id) ? "Remove" : "Add"} ${track.title} ${favorites.has(track.id) ? "from" : "to"} favorites`}><Heart size={14} fill={favorites.has(track.id) ? "currentColor" : "none"} /></button>
                <div className="load-actions"><button onClick={() => loadTrack("A", track)} aria-label={`Load ${track.title} to deck A`}>A</button><button onClick={() => loadTrack("B", track)} aria-label={`Load ${track.title} to deck B`}>B</button><button onClick={() => addToQueue(track)} aria-label={`Add ${track.title} to queue`}>Q</button></div>
              </article>
            ))}
            {!filteredTracks.length && <div className="empty-state"><Disc3 size={28} /><strong>No tracks here yet</strong><span>Try a different filter or import audio.</span></div>}
          </div>
          <div className="library-footer"><Sparkles size={15} /><span>Demo audio is generated on-device.</span></div>
        </aside>

        <section className="mix-workspace">
          <div className="session-bar"><div><span className="session-dot" />LOCAL SESSION</div><span aria-live="polite">{notice}</span><div className="session-actions">{savedSet && <button onClick={restoreSet}><RotateCcw size={13} />Restore</button>}<button onClick={saveSet}><Plus size={14} />Save set</button></div></div>

          {workspaceView === "Mix" && <div className="decks-grid">
            <Deck id="A" state={decks.A} active={activeDeck === "A"} onFocus={() => setActiveDeck("A")} onOptions={() => setPanel("deck-A")} onToggle={() => void toggleDeck("A")} onCue={() => cueDeck("A")} onSeek={(value) => seekDeck("A", value)} onVolume={(volume) => updateDeck("A", { volume })} onEq={(band, value) => updateDeck("A", { eq: { ...decks.A.eq, [band]: value } })} onFx={(effect, value) => updateDeck("A", { fx: { ...decks.A.fx, [effect]: value } })} onLoop={(beats) => toggleLoop("A", beats)} onLoopPoint={(point) => setManualLoopPoint("A", point)} onBeatJump={(beats) => beatJumpDeck("A", beats)} onHotCue={(index, clear) => triggerHotCue("A", index, clear)} onSync={() => syncDeck("A")} />

            <section className="mixer-strip">
              <div className="master-heading"><AudioLines size={17} /><span>MASTER</span><i className={decks.A.playing || decks.B.playing ? "on" : ""} /></div>
              <div className="master-control"><EqKnob label="GAIN" value={Math.round((masterVolume - 0.5) * 24)} onChange={(value) => setMasterVolume(Math.max(0, Math.min(1, value / 24 + 0.5)))} accent="var(--lime)" /></div>
              <div className="meter-wrap"><span>L</span><VuMeter level={masterLevel} /><span>R</span></div>
              <div className="mixer-readout"><span>OUTPUT</span><strong>{masterLevel > 0.02 ? `${Math.round(-28 + masterLevel * 24)}.0` : "-∞"}</strong><small>dB</small></div>
              <div className={`fx-slot recorder-slot ${recording ? "capturing" : ""}`}>
                <span>SESSION RECORDER</span>
                {recording ? (
                  <button onClick={() => void toggleRecording()}><i />LIVE {formatTime(recordingSeconds)}</button>
                ) : lastRecording ? (
                  <a href={lastRecording.url} download={lastRecording.name}><Download size={13} />WAV · {formatTime(lastRecording.duration)} · {(lastRecording.size / 1024 / 1024).toFixed(1)} MB</a>
                ) : (
                  <button onClick={() => void toggleRecording()}><Radio size={13} />Arm recorder</button>
                )}
              </div>
              <div className="crossfader-wrap">
                <div className="crossfader-labels"><b>A</b><span>CROSSFADER</span><b>B</b></div>
                <input className="crossfader" aria-label="Crossfader between deck A and deck B" type="range" min="0" max="1" step="0.01" value={crossfader} onChange={(event) => setCrossfader(Number(event.target.value))} style={{ "--cross-position": `${crossfader * 100}%` } as CSSProperties} />
                <div className="cross-scale"><i /><i /><i /><i /><i /></div>
                <button className="center-cross" onClick={() => setCrossfader(0.5)}>CENTER</button>
              </div>
            </section>

            <Deck id="B" state={decks.B} active={activeDeck === "B"} onFocus={() => setActiveDeck("B")} onOptions={() => setPanel("deck-B")} onToggle={() => void toggleDeck("B")} onCue={() => cueDeck("B")} onSeek={(value) => seekDeck("B", value)} onVolume={(volume) => updateDeck("B", { volume })} onEq={(band, value) => updateDeck("B", { eq: { ...decks.B.eq, [band]: value } })} onFx={(effect, value) => updateDeck("B", { fx: { ...decks.B.fx, [effect]: value } })} onLoop={(beats) => toggleLoop("B", beats)} onLoopPoint={(point) => setManualLoopPoint("B", point)} onBeatJump={(beats) => beatJumpDeck("B", beats)} onHotCue={(index, clear) => triggerHotCue("B", index, clear)} onSync={() => syncDeck("B")} />
          </div>}

          {workspaceView === "Queue" && (
            <section className="queue-workspace">
              <header className="workspace-hero">
                <div><span className="eyebrow">SET FLOW</span><h2>Queue & AutoDJ</h2><p>Shape the next transition without leaving the performance surface.</p></div>
                <div className="queue-controls">
                  <button className={shuffleQueue ? "active" : ""} onClick={() => setShuffleQueue((current) => !current)} aria-pressed={shuffleQueue}><Shuffle size={15} />Shuffle</button>
                  <button className={repeatQueue ? "active" : ""} onClick={() => setRepeatQueue((current) => !current)} aria-pressed={repeatQueue}><Repeat2 size={15} />Repeat</button>
                  <button className={`autodj-button ${autoDj ? "active" : ""}`} onClick={toggleAutoDj} aria-pressed={autoDj}><Sparkles size={15} />{autoDj ? "AutoDJ on" : "Start AutoDJ"}</button>
                </div>
              </header>

              <div className="queue-insight">
                <div><span>NEXT-UP LOGIC</span><strong>{shuffleQueue ? "Shuffle within playable tracks" : "BPM + energy match"}</strong></div>
                <div><span>TRANSITION</span><strong>5.2 sec equal-power fade</strong></div>
                <div><span>ACTIVE DECK</span><strong>Deck {activeDeck} · {decks[activeDeck].track.bpm} BPM</strong></div>
              </div>

              <div className="queue-list-panel">
                <div className="queue-list-heading"><span>{queueTracks.length} TRACKS QUEUED</span><small>Drag rows to reorder · Q from the library adds more</small></div>
                <div className="queue-items">
                  {queueTracks.map((track, index) => {
                    const bpmDelta = track.bpm - decks[activeDeck].track.bpm;
                    return (
                      <article
                        className={`queue-item ${track.url ? "playable" : "preview"}`}
                        key={`${track.id}-${index}`}
                        draggable
                        onDragStart={() => { queueDragIndex.current = index; }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (queueDragIndex.current !== null) moveQueueItem(queueDragIndex.current, index);
                          queueDragIndex.current = null;
                        }}
                      >
                        <GripVertical className="queue-grip" size={17} />
                        <span className="queue-number">{String(index + 1).padStart(2, "0")}</span>
                        <Cover track={track} small />
                        <div className="queue-track-copy"><strong>{track.title}</strong><span>{track.artist} · {track.genre}</span></div>
                        <div className="queue-match"><span>{bpmDelta === 0 ? "MATCH" : `${bpmDelta > 0 ? "+" : ""}${bpmDelta} BPM`}</span><strong>{track.energy}</strong></div>
                        <span className={`availability ${track.url ? "ready" : ""}`}>{track.url ? "Ready" : "Preview"}</span>
                        <button className="queue-play" onClick={() => void playQueuedNow(track)} disabled={!track.url} aria-label={`Play ${track.title} from queue`}><Play size={14} fill="currentColor" />Play</button>
                        <button className="queue-remove" onClick={() => removeFromQueue(index)} aria-label={`Remove ${track.title} from queue`}><X size={16} /></button>
                      </article>
                    );
                  })}
                  {!queueTracks.length && <div className="empty-state queue-empty"><ListMusic size={32} /><strong>Your next move starts here</strong><span>Hover a library track and press Q to build the set.</span></div>}
                </div>
              </div>
            </section>
          )}

          {workspaceView === "Record" && (
            <section className="record-workspace">
              <header className="workspace-hero">
                <div><span className="eyebrow">MASTER CAPTURE</span><h2>Session recorder</h2><p>Capture the exact master bus locally as 44.1 kHz, 16-bit stereo WAV.</p></div>
                <button className={`record-hero-button ${recording ? "recording" : ""}`} onClick={() => void toggleRecording()}><i />{recording ? `Stop · ${formatTime(recordingSeconds)}` : "Start recording"}</button>
              </header>

              <div className="record-dashboard">
                <div className={`record-monitor ${recording ? "live" : ""}`}>
                  <div className="record-orbit"><Radio size={30} /></div>
                  <span>{recording ? "CAPTURING MASTER OUTPUT" : "RECORDER STANDBY"}</span>
                  <strong>{recording ? formatTime(recordingSeconds) : "0:00"}</strong>
                  <p>{recording ? "Keep mixing. Audio never leaves this browser tab." : "Start when your levels are set. Downloads are created when you stop."}</p>
                </div>
                <div className="record-specs">
                  <div><span>FORMAT</span><strong>PCM WAV</strong></div>
                  <div><span>SAMPLE RATE</span><strong>44.1 kHz</strong></div>
                  <div><span>BIT DEPTH</span><strong>16-bit</strong></div>
                  <div><span>CHANNELS</span><strong>Stereo</strong></div>
                </div>
              </div>

              <div className="recording-history">
                <div className="queue-list-heading"><span>RECENT CAPTURES · {recordingHistory.length}/10</span><small>Available for this browser session</small></div>
                {recordingHistory.map((result, index) => (
                  <article className="recording-row" key={result.url}>
                    <span className="recording-index">{String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{result.name}</strong><span>{new Date(result.createdAt).toISOString().slice(11, 16)} UTC · {(result.size / 1024 / 1024).toFixed(1)} MB</span></div>
                    <span className="recording-duration">{formatTime(result.duration)}</span>
                    <a href={result.url} download={result.name}><Download size={14} />Download WAV</a>
                  </article>
                ))}
                {!recordingHistory.length && <div className="empty-state recording-empty"><Radio size={32} /><strong>No captures yet</strong><span>Your latest ten mixes will appear here.</span></div>}
              </div>
            </section>
          )}

          <footer className="workspace-footer"><span><i className="status-ok" />Audio engine ready</span><span>44.1 kHz</span><span>12 ms latency</span><span className="shortcut"><kbd>SPACE</kbd> Play <kbd>C</kbd> Cue <kbd>1–8</kbd> Hot cues <kbd>[ ]</kbd> Loop <kbd>+/-</kbd> Bend</span></footer>
        </section>
      </div>

      {panel && (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPanel(null); }}>
          <section className="app-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <header className="dialog-header">
              <div>
                <span className="eyebrow">{panel.startsWith("deck-") ? "DECK CONTROL" : "MIXDECK LOCAL"}</span>
                <h2 id="dialog-title">{panel === "help" ? "Get mixing fast" : panel === "settings" ? "Session settings" : panel === "profile" ? "Local DJ profile" : `Deck ${panel.slice(-1)} options`}</h2>
              </div>
              <button className="dialog-close" onClick={() => setPanel(null)} aria-label="Close dialog"><X size={18} /></button>
            </header>

            {panel === "help" && (
              <div className="dialog-content">
                <p className="dialog-lede">Two generated demo loops are ready now. Everything else stays local until you choose to import it.</p>
                <ol className="quickstart-list">
                  <li><span>1</span><div><strong>Start a deck</strong><small>Press play on Deck A, then load or start Deck B.</small></div></li>
                  <li><span>2</span><div><strong>Shape the transition</strong><small>Match tempo, set EQ and FX, then move the crossfader.</small></div></li>
                  <li><span>3</span><div><strong>Capture the result</strong><small>Record the master bus and download a local WAV.</small></div></li>
                </ol>
                <div className="shortcut-grid">
                  <span><kbd>Space</kbd> Play / pause</span><span><kbd>C</kbd> Cue</span><span><kbd>F</kbd> Sync</span><span><kbd>1–8</kbd> Hot cues</span><span><kbd>[ ]</kbd> Loop size</span><span><kbd>Ctrl K</kbd> Search</span>
                </div>
                <Link className="dialog-link" href="/welcome">View the MixDeck introduction <ExternalLink size={13} /></Link>
              </div>
            )}

            {panel === "settings" && (
              <div className="dialog-content">
                <div className="settings-card">
                  <ShieldCheck size={20} />
                  <div><strong>Local-first by design</strong><p>Imported audio, recordings, and saved set data stay in this browser. MixDeck sends no audio to a server.</p></div>
                </div>
                <div className="settings-row">
                  <div><strong>Saved set</strong><span>{savedSet ? `Saved ${new Date(savedSet.savedAt).toLocaleString()}` : "No recoverable set saved yet"}</span></div>
                  <div className="settings-actions"><button onClick={saveSet}>Save now</button><button onClick={restoreSet} disabled={!savedSet}>Restore</button></div>
                </div>
                {savedSet && <button className="danger-text-button" onClick={clearSavedSet}>Remove saved set from this browser</button>}
                <p className="settings-note">Local file permissions do not survive a browser restart. Re-import those files, then restore your set controls and cues.</p>
              </div>
            )}

            {panel === "profile" && (
              <div className="dialog-content profile-panel">
                <div className="profile-avatar">AK</div>
                <div><span className="eyebrow">LOCAL SESSION</span><h3>Guest DJ</h3><p>No account is required for the MVP. Your crate, mixes, and saved set are not uploaded.</p></div>
                <div className="profile-status"><CheckCircle2 size={16} />Ready to mix offline</div>
              </div>
            )}

            {panel.startsWith("deck-") && (() => {
              const id = panel.slice(-1) as DeckId;
              const state = decks[id];
              return (
                <div className="dialog-content">
                  <div className="deck-summary"><Cover track={state.track} /><div><span className="eyebrow">LOADED TRACK</span><h3>{state.track.title}</h3><p>{state.track.artist} · {Math.round(state.track.bpm * state.rate)} BPM · {state.track.key}</p></div></div>
                  <div className="deck-stats"><span><b>{state.hotCues.filter((cue) => cue !== null).length}</b> hot cues</span><span><b>{state.loop.enabled ? `${state.loop.beats} beats` : "Off"}</b> loop</span><span><b>{Math.round(state.rate * 100)}%</b> tempo</span></div>
                  <div className="fx-rack-heading"><span>8-EFFECT RACK</span><button onClick={() => updateDeck(id, { fx: defaultFx() })}>Clear FX</button></div>
                  <div className="fx-rack-grid">
                    {FX_NAMES.map((effect) => {
                      const value = state.fx[effect] ?? 0;
                      const isFilter = effect === "filter";
                      return (
                        <label key={effect}>
                          <span>{FX_LABELS[effect]}<b>{isFilter ? value === 0 ? "OPEN" : `${value < 0 ? "LP" : "HP"} ${Math.round(Math.abs(value) * 100)}` : `${Math.round(value * 100)}%`}</b></span>
                          <input aria-label={`Deck ${id} ${FX_LABELS[effect]} effect`} type="range" min={isFilter ? -1 : 0} max="1" step="0.01" value={value} onChange={(event) => updateDeck(id, { fx: { ...state.fx, [effect]: Number(event.target.value) } })} />
                        </label>
                      );
                    })}
                  </div>
                  <button className="reset-deck-button" onClick={() => resetDeck(id)}><RotateCcw size={15} />Reset Deck {id} controls</button>
                  <p className="settings-note">Reset returns transport, tempo, EQ, FX, loops, and hot cues to their defaults. The loaded track stays in place.</p>
                </div>
              );
            })()}
          </section>
        </div>
      )}
    </main>
  );
}
