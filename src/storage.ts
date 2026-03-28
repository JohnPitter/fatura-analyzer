import type { Transaction, Person } from './types';

const DB_NAME = 'fatura-analyzer';
const STORE_NAME = 'analyses';
const DB_VERSION = 1;

export interface SavedAnalysis {
  id: string;
  name: string;
  date: string;
  transactions: Transaction[];
  people: Person[];
  uploadedFiles: string[];
  totalGeral: number;
  transactionCount: number;
}

// --- Web Crypto AES-GCM encryption ---

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encrypt(data: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(data),
  );
  // Pack: salt(16) + iv(12) + ciphertext
  const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return btoa(String.fromCharCode(...result));
}

async function decrypt(encoded: string, password: string): Promise<string> {
  const raw = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const ciphertext = raw.slice(28);
  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

// --- IndexedDB ---

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, data: { id: string; encrypted: string; meta: { name: string; date: string; totalGeral: number; transactionCount: number; uploadedFiles: string[] } }): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGetAll(db: IDBDatabase): Promise<{ id: string; encrypted: string; meta: { name: string; date: string; totalGeral: number; transactionCount: number; uploadedFiles: string[] } }[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, id: string): Promise<{ id: string; encrypted: string; meta: { name: string; date: string; totalGeral: number; transactionCount: number; uploadedFiles: string[] } } | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Public API ---

export async function saveAnalysis(
  password: string,
  name: string,
  transactions: Transaction[],
  people: Person[],
  uploadedFiles: string[],
): Promise<string> {
  const id = `analysis-${Date.now()}`;
  const totalGeral = transactions.reduce((s, t) => s + t.value, 0);
  const payload: SavedAnalysis = {
    id,
    name,
    date: new Date().toISOString(),
    transactions,
    people,
    uploadedFiles,
    totalGeral,
    transactionCount: transactions.length,
  };
  const encrypted = await encrypt(JSON.stringify(payload), password);
  const db = await openDB();
  await idbPut(db, {
    id,
    encrypted,
    meta: { name, date: payload.date, totalGeral, transactionCount: transactions.length, uploadedFiles },
  });
  db.close();
  return id;
}

export async function loadAnalysis(id: string, password: string): Promise<SavedAnalysis> {
  const db = await openDB();
  const record = await idbGet(db, id);
  db.close();
  if (!record) throw new Error('Analise nao encontrada');
  const json = await decrypt(record.encrypted, password);
  return JSON.parse(json);
}

export async function listAnalyses(): Promise<{ id: string; name: string; date: string; totalGeral: number; transactionCount: number; uploadedFiles: string[] }[]> {
  const db = await openDB();
  const records = await idbGetAll(db);
  db.close();
  return records.map(r => ({ id: r.id, ...r.meta })).sort((a, b) => b.date.localeCompare(a.date));
}

export async function deleteAnalysis(id: string): Promise<void> {
  const db = await openDB();
  await idbDelete(db, id);
  db.close();
}
