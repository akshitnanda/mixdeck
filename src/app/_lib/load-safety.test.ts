import assert from "node:assert/strict";
import test from "node:test";
import { needsLoadConfirmation } from "./load-safety.ts";

test("paused decks load without confirmation", () => {
  assert.equal(needsLoadConfirmation(false, false, "first"), false);
});

test("either transport or media playback requires confirmation", () => {
  assert.equal(needsLoadConfirmation(true, false, "first"), true);
  assert.equal(needsLoadConfirmation(false, true, "first"), true);
  assert.equal(needsLoadConfirmation(true, true, "first"), true);
});

test("explicit confirmation authorizes only the displayed playing track", () => {
  assert.equal(needsLoadConfirmation(true, true, "first", "first"), false);
  assert.equal(needsLoadConfirmation(true, true, "second", "first"), true);
});
