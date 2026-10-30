import { INDEXED_DB_UNAVAILABLE_MESSAGE } from "./storageError";

const DB_NAME = "flowgio";
const DB_VERSION = 2;

export const DIAGRAMS_STORE = "diagrams";
export const DRAFTS_STORE = "drafts";

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error(INDEXED_DB_UNAVAILABLE_MESSAGE));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const database = request.result;

      database.onversionchange = () => {
        database.close();
      };

      resolve(database);
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(DIAGRAMS_STORE)) {
        const store = database.createObjectStore(DIAGRAMS_STORE, {
          keyPath: "id",
        });

        store.createIndex("updatedAt", "updatedAt", {
          unique: false,
        });
      }

      if (!database.objectStoreNames.contains(DRAFTS_STORE)) {
        const store = database.createObjectStore(DRAFTS_STORE, {
          keyPath: "id",
        });

        store.createIndex("updatedAt", "updatedAt", {
          unique: false,
        });

        store.createIndex("diagramId", "diagramId", {
          unique: false,
        });
      }
    };
  });
}
