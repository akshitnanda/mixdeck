import assert from "node:assert/strict";
import test from "node:test";
import { crossfadePosition, transitionDurationMs } from "./transition.ts";

test("transition length follows outgoing deck's adjusted tempo", () => {
  assert.equal(transitionDurationMs(8, 120, 1), 4000);
  assert.equal(transitionDurationMs(16, 120, 1.25), 6400);
  assert.equal(transitionDurationMs(4, 120, 0.8), 2500);
});

test("invalid transition settings cannot schedule a fade", () => {
  for (const args of [[0, 120, 1], [32, 120, 1], [8, 0, 1], [8, NaN, 1], [8, 120, Infinity], [8, 120, -1]]) {
    assert.equal(transitionDurationMs(...args as [number, number, number]), null);
  }
});

test("crossfades start at current position and finish at either deck", () => {
  assert.equal(crossfadePosition(0.3, 1, 0, 4000), 0.3);
  assert.ok(Math.abs(crossfadePosition(0.3, 1, 2000, 4000) - 0.65) < 1e-12);
  assert.equal(crossfadePosition(0.3, 1, 8000, 4000), 1);
  assert.equal(crossfadePosition(0.8, 0, 4000, 4000), 0);
  assert.equal(crossfadePosition(0.8, 0, -1, 4000), 0.8);
});
