// PDFSplitter persistence: IndexedDB keeps the uploaded PDF, the split settings, and the
// generated parts so closing or refreshing the tab loses nothing. Every call fails soft —
// a browser that blocks IndexedDB (private mode) just gets no persistence.
import type { ModeId } from "./data";
import type { Mark } from "./mark";
import type { Assignment, Rotations } from "./logic";

export type SessionData = {
  name: string;
  size: number;
  bytes: ArrayBuffer;
  pages: number;
  assign: Assignment;
  rots: Rotations;
  mode: ModeId;
  rangeText: string;
  every: number;
  mark: Mark;
};

export type HistoryPart = { name: string; pages: number[]; bytes: ArrayBuffer };
export type HistoryEntry = {
  id?: number;
  createdAt: number;
  sourceName: string;
  sourcePages: number;
  parts: HistoryPart[];
};

const DB_NAME = "pdf-splitter";
const HISTORY_LIMIT = 10;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore("session");
          req.result.createObjectStore("history", { keyPath: "id", autoIncrement: true });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function withStore<T>(name: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(name, mode);
          const req = run(tx.objectStore(name));
          req.onsuccess = () => resolve(req.result as T);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

// Ask once for persistent storage so the browser is less eager to evict saved PDFs.
let persistAsked = false;
function keepPersistent() {
  if (!persistAsked) {
    persistAsked = true;
    try {
      void navigator.storage?.persist?.();
    } catch {
      // not supported — persistence just stays best-effort
    }
  }
}

export async function saveSession(data: SessionData): Promise<void> {
  keepPersistent();
  await withStore("session", "readwrite", (s) => s.put(data, "current"));
}

export async function loadSession(): Promise<SessionData | null> {
  return withStore<SessionData>("session", "readonly", (s) => s.get("current"));
}

export async function clearSession(): Promise<void> {
  await withStore("session", "readwrite", (s) => s.delete("current"));
}

export async function addHistory(entry: Omit<HistoryEntry, "createdAt">): Promise<void> {
  keepPersistent();
  await withStore("history", "readwrite", (s) => s.add({ ...entry, createdAt: Date.now() }));
  await pruneHistory();
}

// Drop the oldest runs beyond the limit (ids auto-increment, so smallest = oldest).
async function pruneHistory(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction("history", "readwrite");
      const store = tx.objectStore("history");
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const keys = req.result as IDBValidKey[];
        keys.slice(0, Math.max(0, keys.length - HISTORY_LIMIT)).forEach((k) => store.delete(k));
        resolve();
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function listHistory(): Promise<HistoryEntry[]> {
  const entries = (await withStore<HistoryEntry[]>("history", "readonly", (s) => s.getAll())) ?? [];
  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteHistory(id: number): Promise<void> {
  await withStore("history", "readwrite", (s) => s.delete(id));
}

export async function clearHistory(): Promise<void> {
  await withStore("history", "readwrite", (s) => s.clear());
}
