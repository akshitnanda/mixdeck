# MixDeck

MixDeck is a focused, browser-based two-deck DJ console. This first vertical slice turns the product PRD into a functional mixing surface with locally generated demo audio and local-file playback.

Live app: [mixdeck-dj.vercel.app](https://mixdeck-dj.vercel.app/)

## Included

- Two independent Web Audio playback chains
- Constant-power crossfader and per-deck volume
- Working three-band EQ and master gain
- Per-deck low/high-pass filter, tempo-aware feedback delay, and generated stereo reverb
- One, two, four, and eight-beat loops with waveform loop regions
- Eight color-coded hot cues per deck with waveform markers
- Four-beat deck jumps plus keyboard controls for play, cue, sync, loops, hot cues, and momentary pitch bend
- Reorderable set queue with playable-state feedback and direct queue playback
- AutoDJ with BPM/energy selection, shuffle/repeat modes, and 5.2-second crossfades
- Seekable waveforms, playback time, BPM, key, and live master metering
- Local 16-bit stereo WAV recording of the master output with a 10-capture session history
- Local audio import with no upload or network transfer
- Library search, energy filters, favorites, and deck loading
- Tempo sync and cue controls
- Dedicated Mix, Queue, and Record workspaces across desktop, tablet, and mobile layouts
- Distraction-free performance mode with larger touch targets and optional browser fullscreen
- Live OBS/XSplit overlay synchronized across tabs with transparent, dark, and compact variants

The built-in demo loops are synthesized in the browser. Preview-only catalog rows intentionally have no remote audio source; import a local audio file to make additional rows playable. Imported audio and recorded mixes stay on-device unless you explicitly download them.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stream Overlay

Open the overlay in a browser source while MixDeck is running:

- Transparent: [http://localhost:3000/overlay](http://localhost:3000/overlay)
- Dark preview: [http://localhost:3000/overlay?background=dark](http://localhost:3000/overlay?background=dark)
- Compact: [http://localhost:3000/overlay?compact=1](http://localhost:3000/overlay?compact=1)

The overlay reads only the local MixDeck session and updates through `BroadcastChannel` with a same-browser local storage fallback.

## Deploying to Vercel

MixDeck builds as a static Next.js export and does not require environment variables or server-side services.

```bash
npx vercel login
npx vercel deploy --prod
```

Imported tracks, saved sets, and recordings remain in the browser that created them. Each deployed domain has its own local library.

## Verification

```bash
npm run lint
npm run build
npm audit --omit=dev
```
