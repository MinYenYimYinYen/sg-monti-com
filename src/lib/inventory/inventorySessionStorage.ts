import { InventorySession } from "@/app/inventory/InventoryTypes";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { readLocalStorage, writeLocalStorage, removeLocalStorage } from "@/lib/misc/localStorageUtils";

const STORAGE_KEY = "inventory_session";

type PersistedSession = {
  date: string; // ISO date — "2026-06-02"
  session: InventorySession;
};

/**
 * Writes the current session to localStorage, tagged with today's date.
 * Safe to call on every session change — localStorage writes are synchronous
 * and fast for small payloads like this.
 */
export function saveInventorySession(session: InventorySession): void {
  const payload: PersistedSession = { date: dateStrings.today(), session };
  writeLocalStorage(STORAGE_KEY, payload);
}

/**
 * Reads the persisted session from localStorage.
 * Returns null if:
 * - Nothing is stored
 * - The stored date is not today (session expired)
 * - The stored data is malformed
 */
export function loadInventorySession(): InventorySession | null {
  const parsed = readLocalStorage<PersistedSession | null>(STORAGE_KEY, null);
  if (!parsed) return null;
  if (parsed.date !== dateStrings.today()) return null;
  return parsed.session ?? null;
}

/**
 * Removes the persisted session from localStorage.
 * Called after a successful save to the server so the session doesn't
 * re-populate after the user has already committed the check.
 */
export function clearInventorySession(): void {
  removeLocalStorage(STORAGE_KEY);
}
