import { mkdirSync, writeFileSync } from "node:fs";

// Deterministic local-only fixture for import / crate persistence browser QA.
const sampleRate = 16000;
const frames = sampleRate * 4;
const wav = Buffer.alloc(44 + frames * 2);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(frames * 2, 40);
for (let frame = sampleRate; frame < frames; frame++) {
  const time = frame / sampleRate;
  const tone = [261.63, 329.63, 392].reduce((sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * time), 0) / 3;
  wav.writeInt16LE(Math.round(tone * 6000), 44 + frame * 2);
}
mkdirSync(new URL("../coverage/", import.meta.url), { recursive: true });
writeFileSync(new URL("../coverage/tempo-qa.wav", import.meta.url), wav);
console.log("Created coverage/tempo-qa.wav (4 seconds, one-second silent lead-in).");
