# MixDeck

MixDeck is a focused, browser-based two-deck DJ console. This first vertical slice turns the product PRD into a functional mixing surface with locally generated demo audio and local-file playback.

Live app: [mixdeck-dj.vercel.app](https://mixdeck-dj.vercel.app/)

## Included

- Two independent Web Audio playback chains
- Constant-power crossfader and per-deck volume
- Working three-band EQ and master gain
- Per-deck low/high-pass filter, tempo-aware feedback delay, and generated stereo reverb
- One to 32-beat loops with waveform loop regions
- Eight color-coded hot cues per deck with waveform markers
- Large performance pads with cue timestamps, explicit clearing, loop lengths, and beat jumps
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

## Touch Controls

Tap **Pads** in a deck heading (the options button on desktop) to open its performance panel. Tap an empty cue pad to save the current position, then tap it again to jump back. Choose **Clear cues**, tap the saved pads to remove, and choose **Done clearing** to return to playback controls.

The **Loops & jumps** bank provides 1–32 beat loops and four- or sixteen-beat jumps. **Exit loop** releases a running loop. Expand **Track details, auto cue & effects** for the cue suggestion and full effect rack. These panels scroll within the screen in landscape.

The **Tempo** bank adjusts playback from −20% to +25%, with 0.1% fine steps and a reset button. Sync follows the other deck's current playing tempo and reports when a speed limit prevents an exact match.

For imported audio, enter the original **Track BPM**, or tap **Tap BPM** steadily at least four times, then choose **Apply BPM**. BPM corrections update every deck holding that track and save to the local crate. Demo-track corrections last for the current session. Applying a BPM correction exits active loops on that track; changing playback speed alone preserves their beat length. Imported tracks initially use 120 BPM until corrected; tap tempo is a manual estimate.

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
npm run test:audio
npm run build
npm audit --omit=dev
```
