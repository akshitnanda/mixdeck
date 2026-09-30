import assert from "node:assert/strict";
import test from "node:test";
import { defaultLibraryPreferences, parseLibraryPreferences, readLibraryPreferences, saveLibraryPreferences } from "./library-preferences.ts";

test("new, corrupt and unsupported settings fall back safely", () => {
  for (const raw of [null, "{", "null", "[]", '{"version":2}']) {
    assert.deepEqual(parseLibraryPreferences(raw), defaultLibraryPreferences());
  }
});
test("preferences round-trip without search, playback or deck state", () => {
  const expected = { ...defaultLibraryPreferences(), favorites: ["local-track", "neon-runner"], category: "Favorites", energy: "High" as const, sort: "bpm-asc" as const, playableOnly: true };
  let stored = "";
  assert.equal(saveLibraryPreferences(expected, (value) => { stored = value; }), true);
  assert.deepEqual(readLibraryPreferences(() => stored), { preferences: expected, available: true });
  assert.deepEqual(Object.keys(JSON.parse(stored)).sort(), ["category", "energy", "favorites", "playableOnly", "sort", "version"]);
});
test("an intentionally empty favorites list remains empty", () => {
  assert.deepEqual(parseLibraryPreferences('{"version":1,"favorites":[]}').favorites, []);
});
test("valid local favorites survive independently of crate hydration", () => {
  const saved = parseLibraryPreferences('{"version":1,"favorites":["local-not-loaded-yet","local-not-loaded-yet",7,null,""]}');
  assert.deepEqual(saved.favorites, ["local-not-loaded-yet"]);
});
test("invalid individual fields reset without losing valid favorites", () => {
  const saved = parseLibraryPreferences('{"version":1,"favorites":["neon-runner"],"category":"invalid","energy":"loud","sort":"random","playableOnly":"true"}');
  assert.deepEqual(saved, { ...defaultLibraryPreferences(), favorites: ["neon-runner"] });
});
test("storage read and quota failures do not throw", () => {
  assert.equal(readLibraryPreferences(() => { throw new Error("Blocked"); }).available, false);
  assert.equal(saveLibraryPreferences(defaultLibraryPreferences(), () => { throw new Error("Quota exceeded"); }), false);
});
