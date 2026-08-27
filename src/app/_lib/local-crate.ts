export type StoredCrateTrack = {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  duration: number;
  genre: string;
  energy: "Low" | "Medium" | "High";
  color: string;
  accent: string;
  file: Blob;
  fileName: string;
  lastModified: number;
};

const DB_NAME = "mixdeck-local-crate";
const STORE_NAME = "tracks";
const DB_VERSION = 1;

const openCrate = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("Unable to open the local crate."));
});

export const readLocalCrate = async () => {
  const database = await openCrate();
  try {
    return await new Promise<StoredCrateTrack[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as StoredCrateTrack[]);
      request.onerror = () => reject(request.error ?? new Error("Unable to read the local crate."));
    });
  } finally {
    database.close();
  }
};

export const storeLocalTracks = async (tracks: StoredCrateTrack[]) => {
  if (!tracks.length) return;
  const database = await openCrate();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      tracks.forEach((track) => store.put(track));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Unable to save audio in the local crate."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Saving the local crate was interrupted."));
    });
  } finally {
    database.close();
  }
};
