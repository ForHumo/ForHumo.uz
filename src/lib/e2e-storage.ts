// IndexedDB'da E2E private key saqlash (localStorage'dan xavfsizroq).
// Fayl ichida global promise pattern — DB bir marta ochiladi.

const DB_NAME = "forhumo-e2e";
const DB_VERSION = 1;
const STORE = "identity";
const KEY_ID = "self";

interface StoredIdentity {
    id:        string;              // "self"
    keyId:     string;              // serverdagi UserE2eKey.id
    privateJwk: JsonWebKey;
    publicKey: string;              // SPKI base64
    fingerprint: string;
    createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB mavjud emas")); return; }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

export async function saveMyIdentity(data: Omit<StoredIdentity, "id" | "createdAt">): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const full: StoredIdentity = { id: KEY_ID, createdAt: Date.now(), ...data };
        const req = store.put(full);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function getMyIdentity(): Promise<StoredIdentity | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const store = tx.objectStore(STORE);
        const req = store.get(KEY_ID);
        req.onsuccess = () => resolve((req.result as StoredIdentity | undefined) ?? null);
        req.onerror = () => reject(req.error);
    });
}

export async function clearMyIdentity(): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const req = store.delete(KEY_ID);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export async function hasMyIdentity(): Promise<boolean> {
    try { const id = await getMyIdentity(); return id !== null; }
    catch { return false; }
}
