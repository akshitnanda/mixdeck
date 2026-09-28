import assert from "node:assert/strict";
import test from "node:test";
import { filterLibrary, type LibraryTrack } from "./library.ts";

const tracks: LibraryTrack[] = [
  { id: "demo", title: "Neon", artist: "Labs", genre: "House", key: "8A", bpm: 128, energy: "High", source: "Demo", url: "blob:demo" },
  { id: "local", title: "After", artist: "Local upload", genre: "House", key: "9A", bpm: 122, energy: "Medium", source: "Local", url: "blob:local" },
  { id: "preview", title: "Night", artist: "Artist", genre: "House", key: "8A", bpm: 128, energy: "High", source: "Catalog" },
];
const defaults = { search: "", category: "All tracks", energy: null, playableOnly: false, favorites: new Set(["demo", "local"]), sort: "recent" } as const;
const ids = (result: LibraryTrack[]) => result.map((track) => track.id);

test("playable-only excludes previews without changing the source crate", () => {
  assert.deepEqual(ids(filterLibrary(tracks, { ...defaults, playableOnly: true })), ["demo", "local"]);
  assert.deepEqual(ids(tracks), ["demo", "local", "preview"]);
});
test("category, energy, search and availability compose", () => {
  assert.deepEqual(ids(filterLibrary(tracks, { ...defaults, category: "Favorites", energy: "High", search: "HOUSE 128", playableOnly: true })), ["demo"]);
  assert.deepEqual(ids(filterLibrary(tracks, { ...defaults, category: "Local files", energy: "High" })), []);
  assert.deepEqual(ids(filterLibrary(tracks, { ...defaults, category: "Local files", energy: "Medium" })), ["local"]);
});
test("search supports key, tempo and whitespace-separated terms", () => {
  assert.deepEqual(ids(filterLibrary(tracks, { ...defaults, search: "  8a   LABS  " })), ["demo"]);
  assert.deepEqual(ids(filterLibrary(tracks, { ...defaults, search: "missing" })), []);
});
test("sorts both BPM directions with stable ties and restores insertion order", () => {
  assert.deepEqual(ids(filterLibrary(tracks, { ...defaults, sort: "bpm-asc" })), ["local", "demo", "preview"]);
  assert.deepEqual(ids(filterLibrary(tracks, { ...defaults, sort: "bpm" })), ["demo", "preview", "local"]);
  assert.deepEqual(ids(filterLibrary(tracks, { ...defaults, sort: "title" })), ["local", "demo", "preview"]);
  assert.deepEqual(ids(filterLibrary(tracks, defaults)), ["demo", "local", "preview"]);
});
