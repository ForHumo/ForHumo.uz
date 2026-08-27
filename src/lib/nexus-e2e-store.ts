// E2E kalit ombori — IndexedDB'da private key va metadata saqlaydi.
// Har profileId+keyId juftligi uchun bitta yozuv.
//
// Xavfsizlik:
//   - Private key JWK sifatida saqlanadi (browser origin-scoped)
//   - Boshqa origin/tab bilan bo'lishilmaydi
//   - Profile logout'ida clearAll() chaqiriladi

const DB_NAME = "forhumo-e2e";
const DB_VERSION = 1;
const STORE = "keys";

export type StoredKey = {
    keyId: string;               // UserE2eKey.id (server tomon)
    profileId: string;           // owner profile
    publicKeyBase64: string;     // SPKI base64
    fingerprint: string;         // SHA-256 hex (40 char)
    privateJwk: JsonWebKey;      // private key JWK
    deviceLabel: string | null;
    createdAt: number;           // epoch ms
    isActive: boolean;           // faol kalit (bir vaqtda faqat bittasi)
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
        return Promise.reject(new Error("IndexedDB mavjud emas"));
    }
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: "keyId" });
                store.createIndex("profileId", "profileId", { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

export async function saveKey(k: StoredKey): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(k);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getKey(keyId: string): Promise<StoredKey | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(keyId);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
    });
}

export async function listKeys(profileId: string): Promise<StoredKey[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).index("profileId").getAll(profileId);
        req.onsuccess = () => resolve((req.result as StoredKey[]) ?? []);
        req.onerror = () => reject(req.error);
    });
}

export async function getActiveKey(profileId: string): Promise<StoredKey | null> {
    const list = await listKeys(profileId);
    return list.find(k => k.isActive) ?? null;
}

export async function setActive(profileId: string, keyId: string): Promise<void> {
    const list = await listKeys(profileId);
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        for (const k of list) {
            tx.objectStore(STORE).put({ ...k, isActive: k.keyId === keyId });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function deleteKey(keyId: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(keyId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function clearAll(): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
