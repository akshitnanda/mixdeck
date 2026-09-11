import assert from "node:assert/strict";
import test from "node:test";

import { detectCuePoint } from "./audio-analysis.ts";

const SAMPLE_RATE = 8_000;

const sineFixture = (duration: number, onset: number, amplitude = 0.5) => {
  const samples = new Float32Array(Math.round(duration * SAMPLE_RATE));
  for (let index = Math.round(onset * SAMPLE_RATE); index < samples.length; index += 1) {
    samples[index] = Math.sin(2 * Math.PI * 220 * index / SAMPLE_RATE) * amplitude;
  }
  return samples;
};

test("returns track start for audio that begins immediately", () => {
  const suggestion = detectCuePoint(sineFixture(2, 0), SAMPLE_RATE);
  assert.equal(suggestion.time, 0);
  assert.ok(suggestion.confidence >= 0.4);
});

test("finds the first sustained onset after leading silence", () => {
  const suggestion = detectCuePoint(sineFixture(3, 1), SAMPLE_RATE);
  assert.ok(suggestion.time >= 0.94 && suggestion.time <= 1.03, `received ${suggestion.time}`);
  assert.ok(suggestion.confidence >= 0.55);
});

test("does not mistake low-level opening noise for the musical onset", () => {
  const samples = sineFixture(3, 1.25);
  for (let index = 0; index < 1.25 * SAMPLE_RATE; index += 1) {
    samples[index] = Math.sin(index * 0.73) * 0.001;
  }
  const suggestion = detectCuePoint(samples, SAMPLE_RATE);
  assert.ok(suggestion.time >= 1.18 && suggestion.time <= 1.28, `received ${suggestion.time}`);
});

test("returns a low-confidence track-start fallback for silence", () => {
  const suggestion = detectCuePoint(new Float32Array(SAMPLE_RATE), SAMPLE_RATE);
  assert.equal(suggestion.time, 0);
  assert.ok(suggestion.confidence <= 0.2);
});
