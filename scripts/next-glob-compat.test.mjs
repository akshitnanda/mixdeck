import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const { getRootDirs } = require("@next/eslint-plugin-next/dist/utils/get-root-dirs.js");
const pluginRequire = createRequire(require.resolve("@next/eslint-plugin-next"));
const cwd = process.cwd();
const normalize = (paths) => paths.map((value) => value.replaceAll("\\", "/").replace(/\/$/, "")).sort();
const roots = (rootDir) => normalize(getRootDirs({ cwd, settings: { next: { rootDir } } }));

test("Next lint plugin uses the scoped glob adapter", () => {
  assert.equal(pluginRequire("fast-glob/package.json").name, "mixdeck-next-glob-compat");
});

test("default and explicit roots remain single directories, not expanded trees", () => {
  assert.deepEqual(roots(undefined), normalize([cwd]));
  assert.deepEqual(roots("src/app"), ["src/app"]);
  assert.deepEqual(roots(path.join(cwd, "src", "app")), normalize([path.join(cwd, "src", "app")]));
  assert.deepEqual(roots("src/app/page.tsx"), []);
});

test("directory patterns, braces, arrays, and Windows separators retain root discovery", () => {
  assert.deepEqual(roots("src/app/_*"), ["src/app/_components", "src/app/_lib"]);
  assert.deepEqual(roots("src/app/{_components,_lib}"), ["src/app/_components", "src/app/_lib"]);
  assert.deepEqual(roots(["src/app/_lib", "src/app/_components", null]), ["src/app/_components", "src/app/_lib"]);
  assert.deepEqual(roots("src\\app\\_lib"), ["src/app/_lib"]);
  assert.deepEqual(roots("src/no-such-project-*"), []);
});
