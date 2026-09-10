import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MixDeck — Browser DJ Console",
    short_name: "MixDeck",
    description: "A local-first two-deck DJ console for mixing, recording, and streaming from the browser.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#080a0d",
    theme_color: "#080a0d",
    categories: ["music", "entertainment", "utilities"],
    icons: [
      {
        src: "/icons/mixdeck-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/mixdeck-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/mixdeck-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Open mixer", short_name: "Mixer", url: "/" },
      { name: "Open stream overlay", short_name: "Overlay", url: "/overlay?background=dark" },
    ],
  };
}
