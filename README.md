# MixDeck

MixDeck is a focused, browser-based two-deck DJ console. This first vertical slice turns the product PRD into a functional mixing surface with locally generated demo audio and local-file playback.

Live app: [mixdeck-dj.vercel.app](https://mixdeck-dj.vercel.app/)

## Included

- Two independent Web Audio playback chains
- Constant-power crossfader and per-deck volume
- Transition Lab with live deck comparison, tempo matching, and 4/8/16-beat manual blends
- Working three-band EQ and master gain
- Per-deck low/high-pass filter, tempo-aware feedback delay, and generated stereo reverb
- One to 32-beat loops with waveform loop regions
- Eight color-coded hot cues per deck with waveform markers
- Manual beat-grid anchors, 4/4 eight-bar phrase readouts, and optional snapping for new hot cues and beat loops
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

Each library track has always-visible **Load A**, **Load B**, and **Queue** buttons, with loaded and queued states. Track details sit above the actions so they remain readable on narrow screens. Preview-only tracks explain why they cannot be loaded.

Use **Playable only** to hide catalog previews. Combine energy with **Favorites** or **Local files**, and search by title, artist, genre, BPM, or key (for example, `house 128`). The sort menu offers title, recently added, and both BPM directions. The result count shows matching versus total tracks; **Clear filters** restores the full crate without changing your sort order.

Favorites, category, energy, playable-only mode, and sort order save automatically in this browser on this domain. Search text and deck-loading targets are temporary and never restored. If preference storage is unavailable, the library footer reports that changes are temporary. Clearing filters does not remove favorites; restoring a saved set still restores that set's favorites.

Tap **Load** in either deck heading to choose a track for that deck. **Import to A/B** loads the first selected audio file directly and adds any remaining files to the crate. Loading returns mobile users to the Mix workspace; dismissing the library cancels the import target.

On mobile and tablet, the full-height crate keeps **Import** and **Close** pinned while its contents scroll. Compact category tabs leave more room for tracks. Tab stays within the open drawer; Close or Escape returns keyboard focus to its opener. The closed drawer is removed from keyboard navigation.

Manual loading protects a playing deck: choose **Keep playing**, load the other paused deck when available, or explicitly **Stop & replace**. Playback continues while the prompt is open. Imported files remain in the crate if you cancel; paused decks still load immediately. This guard covers library and targeted-import loading, not intentional queue playback or AutoDJ transitions.

Tap **Pads** in a deck heading (the options button on desktop) to open its performance panel. Tap an empty cue pad to save the current position, then tap it again to jump back. Choose **Clear cues**, tap the saved pads to remove, and choose **Done clearing** to return to playback controls.

The **Loops & jumps** bank provides 1–32 beat loops and four- or sixteen-beat jumps. **Exit loop** releases a running loop. Expand **Track details, auto cue & effects** for the cue suggestion and full effect rack. These panels scroll within the screen in landscape.

The **Tempo** bank adjusts playback from −20% to +25%, with 0.1% fine steps and a reset button. Sync follows the other deck's current playing tempo and reports when a speed limit prevents an exact match.

For imported audio, enter the original **Track BPM**, or tap **Tap BPM** steadily at least four times, then choose **Apply BPM**. BPM corrections update every deck holding that track and save to the local crate. Demo-track corrections last for the current session. Applying a BPM correction exits active loops on that track; changing playback speed alone preserves their beat length. Imported tracks initially use 120 BPM until corrected; tap tempo is a manual estimate.

## Beat Grid & Track Preparation

Open a deck's **Pads → Beat grid**. Set the original track BPM in **Tempo**, position the playhead at a downbeat, and choose **Set beat 1 here**. Fine-tune with **Grid −10 ms / +10 ms**. Anchors for local audio save to the device's crate and update every deck holding the track; demo anchors start at zero and edits last for the session. A grid edit releases active loops on that track without moving existing cues.

The readout counts four beats per bar and eight bars per phrase from that anchor. **Previous/Next bar** and **Previous/Next phrase** seek to grid boundaries and exit loops; unavailable boundaries are disabled. These are manual structural assumptions, not beat or phrase detection. The full-track overview shows actual grid markers and playhead position over an **illustrative**, not audio-derived, waveform.

Enable **Snap ON** to place newly saved hot cues and beat-loop starts on the nearest grid beat. A snapped loop requires enough audio for its full length. Existing cues are not moved; manual IN/OUT points and relative beat jumps remain unchanged. Snapping changes position, not trigger timing, and resets off when loading a track, resetting a deck, or restoring a set. Playback-rate changes do not shift the grid because its timing uses source seconds.

## Transition Lab

Tap **BLEND** under the mixer crossfader. Compare the two decks' adjusted BPM, metadata-based key relationship, and energy direction. **Match A to B** or **Match B to A** changes tempo only; align cues by ear.

With both decks playing, choose **4**, **8**, or **16 beats**, then **Fade to A/B**. The equal-power fade starts immediately and lasts that many beats at the outgoing deck's tempo when launched. This is not beat-grid or phrase synchronization. Neither deck is started, replaced, or stopped automatically.

Moving either crossfader, **Center mix**, or **Take manual control** cancels the fade and AutoDJ (including its pending stop timer). A pause, track replacement, or tempo change stops a manual blend at its current position. Closing the lab leaves the fade running. All lab actions have touch-sized targets and the panel scrolls in landscape.

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
