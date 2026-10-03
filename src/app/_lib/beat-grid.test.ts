import assert from "node:assert/strict";
import test from "node:test";
import { gridJumpTarget, gridLoopRange, gridMarkers, gridPosition, nearestGridBeat, validGridAnchor } from "./beat-grid.ts";

test("anchors accept track start but reject missing, corrupt and end-of-track metadata", () => {
  assert.equal(validGridAnchor(0, 24), 0);
  assert.equal(validGridAnchor(1.125, 24), 1.125);
  for (const value of [undefined, null, "1", -1, NaN, Infinity, 24, 25]) assert.equal(validGridAnchor(value, 24), null);
  assert.equal(validGridAnchor(0, 0), null);
});

test("phrase counter is relative to a manual 4/4 eight-bar anchor", () => {
  assert.equal(gridPosition(0, 120, 1)?.beforeAnchor, true);
  assert.deepEqual(gridPosition(1, 120, 1), { beforeAnchor: false, beat: 1, bar: 1, phrase: 1 });
  assert.deepEqual(gridPosition(16.5, 120, 1), { beforeAnchor: false, beat: 4, bar: 8, phrase: 1 });
  assert.deepEqual(gridPosition(17, 120, 1), { beforeAnchor: false, beat: 1, bar: 1, phrase: 2 });
  assert.equal(gridPosition(1, 0, 0), null);
  assert.equal(gridPosition(1, 120, null), null);
});

test("cue snapping uses source time and never returns track end", () => {
  assert.equal(nearestGridBeat(1.21, 120, 0, 24), 1);
  assert.equal(nearestGridBeat(1.26, 120, 0, 24), 1.5);
  assert.equal(nearestGridBeat(0, 120, 1, 24), 1);
  assert.equal(nearestGridBeat(24, 120, 0, 24), 23.5);
  assert.equal(nearestGridBeat(1.3, 120, 0.1, 24), 1.1);
  assert.equal(nearestGridBeat(1, 120, undefined, 24), null);
});

test("bar and phrase jumps use strict boundaries and refuse out-of-track moves", () => {
  assert.equal(gridJumpTarget(0, 120, 1, 40, 1, 4), 1);
  assert.equal(gridJumpTarget(0, 120, 9, 40, 1, 4), 9);
  assert.equal(gridJumpTarget(1, 120, 1, 40, 1, 4), 3);
  assert.equal(gridJumpTarget(3.1, 120, 1, 40, -1, 4), 3);
  assert.equal(gridJumpTarget(3, 120, 1, 40, -1, 4), 1);
  assert.equal(gridJumpTarget(2, 120, 1, 40, 1, 32), 17);
  assert.equal(gridJumpTarget(17, 120, 1, 40, -1, 32), 1);
  assert.equal(gridJumpTarget(0, 120, 1, 40, -1, 4), null);
  assert.equal(gridJumpTarget(39, 120, 1, 40, 1, 4), null);
});

test("snapped loops retain their full beat length or fail without truncation", () => {
  assert.deepEqual(gridLoopRange(1.3, 4, 120, 0, 24), { start: 1.5, end: 3.5 });
  assert.deepEqual(gridLoopRange(22, 4, 120, 0, 24), { start: 22, end: 24 });
  assert.equal(gridLoopRange(23, 4, 120, 0, 24), null);
  assert.equal(gridLoopRange(1, 4, 120, null, 24), null);
});

test("overview markers remain bounded even for long audio", () => {
  const markers = gridMarkers(120, 1, 40);
  assert.deepEqual(markers[0], { time: 1, phraseStart: true });
  assert.deepEqual(markers[8], { time: 17, phraseStart: true });
  const long = gridMarkers(240, 0, 7200);
  assert.ok(long.length <= 48);
  assert.ok(long.every((marker) => marker.time < 7200));
  assert.deepEqual(gridMarkers(120, null, 40), []);
});

test("invalid tempo and timing metadata fail closed across all grid operations", () => {
  for (const bpm of [0, -1, 39, 241, NaN, Infinity, Number.MAX_VALUE]) {
    assert.equal(gridPosition(1, bpm, 0), null);
    assert.equal(nearestGridBeat(1, bpm, 0, 40), null);
    assert.equal(gridJumpTarget(1, bpm, 0, 40, 1, 4), null);
    assert.equal(gridLoopRange(1, 4, bpm, 0, 40), null);
    assert.deepEqual(gridMarkers(bpm, 0, 40), []);
  }
  assert.equal(nearestGridBeat(NaN, 120, 0, 40), null);
  assert.equal(gridJumpTarget(Infinity, 120, 0, 40, 1, 4), null);
  assert.deepEqual(gridMarkers(120, 0, Infinity), []);
});
