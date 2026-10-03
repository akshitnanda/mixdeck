// Scoped to @next/eslint-plugin-next 16.3.8: its only fast-glob call is
// globSync(pattern, { onlyDirectories: true }) in get-root-dirs.js.
// Disable tinyglobby's directory expansion to retain fast-glob semantics.
/* eslint-disable @typescript-eslint/no-require-imports -- Next's CommonJS plugin needs a synchronous CommonJS adapter. */
const { globSync } = require("tinyglobby");
const { isAbsolute } = require("node:path");

exports.globSync = (pattern, options) => {
  if (typeof pattern !== "string") throw new TypeError("Next root-directory patterns must be strings.");
  return globSync(pattern, {
    ...options,
    absolute: options?.absolute ?? isAbsolute(pattern),
    expandDirectories: false,
  });
};
