import type { LibraryEnergy, LibrarySort } from "./library";

export const LIBRARY_PREFERENCES_KEY = "mixdeck-library-preferences-v1";
export type LibraryPreferences = {
  version: 1;
  favorites: string[];
  category: string;
  energy: LibraryEnergy | null;
  sort: LibrarySort;
  playableOnly: boolean;
};

export function defaultLibraryPreferences(): LibraryPreferences {
  return { version: 1, favorites: ["afterglow"], category: "All tracks", energy: null, sort: "recent", playableOnly: false };
}

export function parseLibraryPreferences(raw: string | null): LibraryPreferences {
  const defaults = defaultLibraryPreferences();
  if (!raw) return defaults;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1) return defaults;
    const data = value as Record<string, unknown>;
    return {
      version: 1,
      // Preserve local IDs even before asynchronous crate hydration finishes.
      favorites: Array.isArray(data.favorites)
        ? [...new Set(data.favorites.filter((id): id is string => typeof id === "string" && id.length > 0))]
        : defaults.favorites,
      category: ["All tracks", "Favorites", "Local files"].includes(data.category as string) ? data.category as string : defaults.category,
      energy: ["High", "Medium", "Low"].includes(data.energy as string) ? data.energy as LibraryEnergy : null,
      sort: ["recent", "title", "bpm", "bpm-asc"].includes(data.sort as string) ? data.sort as LibrarySort : defaults.sort,
      playableOnly: typeof data.playableOnly === "boolean" ? data.playableOnly : false,
    };
  } catch {
    return defaults;
  }
}

export function readLibraryPreferences(read: () => string | null) {
  try {
    return { preferences: parseLibraryPreferences(read()), available: true };
  } catch {
    return { preferences: defaultLibraryPreferences(), available: false };
  }
}

export function saveLibraryPreferences(preferences: LibraryPreferences, write: (value: string) => void): boolean {
  try {
    write(JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
