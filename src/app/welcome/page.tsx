import { ArrowRight, AudioLines, Headphones, Radio, ShieldCheck, Sparkles, Waves } from "lucide-react";
import Link from "next/link";
import styles from "./welcome.module.css";

const capabilities = [
  { icon: AudioLines, label: "Two-deck engine", copy: "Tempo, EQ, FX, loops, hot cues, beat jump, and equal-power crossfades." },
  { icon: Sparkles, label: "AutoDJ queue", copy: "Build a set, reorder it, and hand transitions to BPM-aware local automation." },
  { icon: Radio, label: "Master capture", copy: "Record the final mix bus and download a 44.1 kHz stereo WAV." },
];

export default function Welcome() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Welcome navigation">
        <Link className={styles.brand} href="/">
          <span><Waves size={22} strokeWidth={2.7} /></span>
          mixdeck <sup>BETA</sup>
        </Link>
        <div className={styles.navMeta}><i /> Browser audio ready</div>
        <Link className={styles.navCta} href="/">Open console <ArrowRight size={14} /></Link>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}><span>LOCAL-FIRST DJ WORKSTATION</span><i /></div>
          <h1>Your next mix starts <em>before the first beat.</em></h1>
          <p>Learn, perform, and record in one focused browser console. No account, no audio upload, no setup maze.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/">Start mixing <ArrowRight size={17} /></Link>
            <span><Headphones size={16} /> Two demo loops included</span>
          </div>
        </div>

        <div className={styles.consolePreview} aria-label="Abstract preview of the MixDeck console">
          <div className={styles.previewTop}><span><Waves size={14} /> MIXDECK / SESSION 01</span><i /></div>
          <div className={styles.previewDecks}>
            <article className={styles.previewDeckA}>
              <header><span>DECK A</span><small>128 BPM</small></header>
              <div className={styles.previewTrack}><i /><div><b>Neon Runner</b><small>MixDeck Labs</small></div></div>
              <div className={styles.waveform}>{Array.from({ length: 42 }, (_, index) => <i key={index} style={{ height: `${28 + ((index * 29) % 64)}%` }} />)}</div>
              <div className={styles.previewControls}><i /><i /><strong>▶</strong><i /><i /></div>
            </article>
            <div className={styles.previewMixer}><span>MASTER</span><div>{Array.from({ length: 12 }, (_, index) => <i key={index} className={index < 8 ? styles.lit : ""} />)}</div><b>A ··· B</b></div>
            <article className={styles.previewDeckB}>
              <header><span>DECK B</span><small>122 BPM</small></header>
              <div className={styles.previewTrack}><i /><div><b>Afterglow</b><small>MixDeck Labs</small></div></div>
              <div className={styles.waveform}>{Array.from({ length: 42 }, (_, index) => <i key={index} style={{ height: `${25 + ((index * 37) % 68)}%` }} />)}</div>
              <div className={styles.previewControls}><i /><i /><strong>▶</strong><i /><i /></div>
            </article>
          </div>
          <div className={styles.previewStatus}><span><i /> AUDIO ENGINE READY</span><span>44.1 KHZ</span><span>12 MS</span></div>
        </div>
      </section>

      <section className={styles.capabilities} aria-label="MixDeck capabilities">
        {capabilities.map(({ icon: Icon, label, copy }, index) => (
          <article key={label}>
            <div className={styles.capabilityIndex}>0{index + 1}</div>
            <Icon size={20} />
            <h2>{label}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className={styles.privacy}>
        <div className={styles.privacyIcon}><ShieldCheck size={28} /></div>
        <div><span>YOUR AUDIO, YOUR MACHINE</span><h2>Private by default. Useful immediately.</h2></div>
        <p>Imported files stay in the active browser session. Recordings download directly to you, while recoverable set controls are stored only in your browser.</p>
        <Link href="/">Enter the console <ArrowRight size={14} /></Link>
      </section>

      <footer className={styles.footer}><span>MixDeck MVP · Built for focused practice and streaming</span><span>Web Audio · Local WAV · OBS overlay</span></footer>
    </main>
  );
}
