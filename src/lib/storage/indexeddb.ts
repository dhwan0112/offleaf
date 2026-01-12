import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'offleaf-db';
const DB_VERSION = 1;

interface OffLeafDB {
  pdfs: {
    key: string;
    value: {
      projectId: string;
      data: Uint8Array;
      timestamp: number;
    };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

class StorageManager {
  private db: IDBPDatabase<OffLeafDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OffLeafDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store for cached PDFs
        if (!db.objectStoreNames.contains('pdfs')) {
          db.createObjectStore('pdfs');
        }
        // Store for user settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }

  async savePdf(projectId: string, data: Uint8Array): Promise<void> {
    await this.init();
    await this.db!.put('pdfs', {
      projectId,
      data,
      timestamp: Date.now(),
    }, projectId);
  }

  async getPdf(projectId: string): Promise<Uint8Array | null> {
    await this.init();
    const result = await this.db!.get('pdfs', projectId);
    return result?.data || null;
  }

  async deletePdf(projectId: string): Promise<void> {
    await this.init();
    await this.db!.delete('pdfs', projectId);
  }

  async saveSetting<T>(key: string, value: T): Promise<void> {
    await this.init();
    await this.db!.put('settings', value, key);
  }

  async getSetting<T>(key: string): Promise<T | null> {
    await this.init();
    const result = await this.db!.get('settings', key);
    return (result as T) || null;
  }

  async clearAll(): Promise<void> {
    await this.init();
    await this.db!.clear('pdfs');
    await this.db!.clear('settings');
  }
}

export const storage = new StorageManager();
