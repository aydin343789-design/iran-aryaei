/** On-device library of generated clips (IndexedDB) — no server involved. */

export interface Clip {
  id: string;
  text: string;
  voiceId: string;
  toneId: string;
  blob: Blob;
  mime: string;
  durationSec: number;
  sizeBytes: number;
  favorite: boolean;
  createdAt: number;
}

const DB_NAME = "avasaz-library";
const STORE = "clips";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
    tx.onabort = () => reject(tx.error);
  });
}

export const putClip = (clip: Clip) => run("readwrite", (s) => s.put(clip));
export const deleteClip = (id: string) => run("readwrite", (s) => s.delete(id));

export async function listClips(): Promise<Clip[]> {
  const all = await run<Clip[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function setFavorite(id: string, favorite: boolean) {
  const clip = await run<Clip | undefined>("readonly", (s) => s.get(id));
  if (clip) await putClip({ ...clip, favorite });
}

export function newClipId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
