import assert from "node:assert/strict";
import test from "node:test";
import { beatSeconds, matchingRate, tapBpm } from "./tempo.ts";

test("sync follows the other deck's adjusted playing tempo", () => {
  assert.equal(matchingRate(120, 128, 1.125), 1.2);
  assert.equal(matchingRate(120, 200, 1), 1.25);
  assert.equal(matchingRate(120, 60, 1), 0.8);
});

test("a four beat loop remains four beats when played faster", () => {
  const sourceDistance = beatSeconds(4, 120);
  const rate = 1.25;
  assert.equal(sourceDistance, 2);
  assert.equal(sourceDistance / rate, 4 * 60 / (120 * rate));
  assert.equal(beatSeconds(-16, 120), -8);
});

test("tap tempo measures steady and slightly uneven rhythms", () => {
  assert.equal(tapBpm([0, 500, 1000, 1500]), 120);
  assert.equal(tapBpm([0, 666.6667, 1333.3334, 2000.0001]), 90);
  assert.equal(tapBpm([0, 490, 1000, 1500, 2000]), 120);
});

test("tap tempo rejects too few taps, pauses, and impossible intervals", () => {
  assert.equal(tapBpm([0, 500, 1000]), null);
  assert.equal(tapBpm([0, 500, 1000, 4000]), null);
  assert.equal(tapBpm([0, 100, 200, 300]), null);
  assert.equal(tapBpm([0, 500, Number.NaN, 1500]), null);
});
