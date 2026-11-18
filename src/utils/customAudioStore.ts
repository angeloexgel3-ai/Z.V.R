export type CustomAudioSlot = 'message' | 'call';

export interface StoredCustomAudio {
  slot: CustomAudioSlot;
  fileName: string;
  mimeType: string;
  blob: Blob;
  updatedAt: number;
}

const DB_NAME = 'zvr_custom_audio_db';
const STORE_NAME = 'audio_slots';
const DB_VERSION = 1;

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'slot' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

export async function saveCustomAudio(
  slot: CustomAudioSlot,
  file: File
): Promise<{ fileName: string; objectUrl: string }> {
  const db = await openAudioDB();
  const record: StoredCustomAudio = {
    slot,
    fileName: file.name,
    mimeType: file.type || 'audio/mpeg',
    blob: file,
    updatedAt: Date.now(),
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to save custom audio'));
  });
  db.close();

  const objectUrl = URL.createObjectURL(file);
  return { fileName: file.name, objectUrl };
}

export async function loadCustomAudio(
  slot: CustomAudioSlot
): Promise<{ fileName: string; objectUrl: string } | null> {
  try {
    const db = await openAudioDB();
    const result = await new Promise<StoredCustomAudio | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(slot);
      req.onsuccess = () => resolve(req.result as StoredCustomAudio | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();

    if (!result || !result.blob) return null;
    const objectUrl = URL.createObjectURL(result.blob);
    return { fileName: result.fileName, objectUrl };
  } catch {
    return null;
  }
}

export async function deleteCustomAudio(slot: CustomAudioSlot): Promise<void> {
  try {
    const db = await openAudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(slot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // safe ignore
  }
}
