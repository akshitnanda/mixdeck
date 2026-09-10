import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root, "out", "manifest.webmanifest"), "utf8"));
const html = readFileSync(join(root, "out", "index.html"), "utf8");
const worker = readFileSync(join(root, "out", "sw.js"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pngSize(path) {
  const buffer = readFileSync(path);
  assert(buffer.subarray(1, 4).toString("ascii") === "PNG", `${path} is not a PNG`);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

assert(manifest.name === "MixDeck — Browser DJ Console", "Unexpected manifest name");
assert(manifest.display === "standalone" && manifest.start_url === "/", "Manifest is not launchable");
assert(manifest.icons.some((icon) => icon.sizes === "192x192"), "Manifest is missing its 192px icon");
assert(manifest.icons.some((icon) => icon.sizes === "512x512"), "Manifest is missing its 512px icon");
assert(pngSize(join(root, "out", "icons", "mixdeck-192.png")).every((size) => size === 192), "192px icon dimensions are invalid");
assert(pngSize(join(root, "out", "icons", "mixdeck-512.png")).every((size) => size === 512), "512px icon dimensions are invalid");
assert(html.includes('rel="manifest"') && html.includes("/manifest.webmanifest"), "The app shell does not link its manifest");
assert(worker.includes('self.addEventListener("install"') && worker.includes('self.addEventListener("fetch"'), "Service worker lifecycle handlers are missing");
assert(worker.includes('caches.match("/")'), "Service worker navigation fallback is missing");

console.log("PWA manifest, icons, app-shell link, and offline fallback verified.");
