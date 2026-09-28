export type LibrarySort = "recent" | "title" | "bpm" | "bpm-asc";
export type LibraryEnergy = "Low" | "Medium" | "High";
export type LibraryTrack = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  key: string;
  bpm: number;
  energy: LibraryEnergy;
  source: string;
  url?: string;
};

export function filterLibrary<T extends LibraryTrack>(tracks: readonly T[], options: {
  search: string;
  category: string;
  energy: LibraryEnergy | null;
  playableOnly: boolean;
  favorites: ReadonlySet<string>;
  sort: LibrarySort;
}): T[] {
  const terms = options.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = tracks.filter((track) => {
    const text = `${track.title} ${track.artist} ${track.genre} ${track.key} ${track.bpm}`.toLowerCase();
    const inCategory = options.category === "All tracks"
      || (options.category === "Favorites" && options.favorites.has(track.id))
      || (options.category === "Local files" && track.source === "Local");
    return inCategory && terms.every((term) => text.includes(term))
      && (!options.energy || track.energy === options.energy)
      && (!options.playableOnly || Boolean(track.url));
  });
  return matches.sort((left, right) => {
    if (options.sort === "title") return left.title.localeCompare(right.title);
    if (options.sort === "bpm") return right.bpm - left.bpm;
    if (options.sort === "bpm-asc") return left.bpm - right.bpm;
    return 0; // Preserve crate insertion order and stable ties.
  });
}
