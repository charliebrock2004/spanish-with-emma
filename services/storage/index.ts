/**
 * Persistence adapter. The game store talks to this interface only, so moving
 * from localStorage to a real backend (e.g. a user account synced through an
 * API route) means providing another implementation — nothing else changes.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

const memory = new Map<string, string>();

/**
 * localStorage with an in-memory fallback — Safari private browsing and
 * locked-down browsers can throw on access, and the game must keep working.
 */
export const browserStorage: KeyValueStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
};
