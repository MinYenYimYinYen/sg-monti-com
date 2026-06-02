import { InventorySession } from "@/app/inventory/InventoryTypes";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

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
  try {
    const payload: PersistedSession = { date: dateStrings.today(), session };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable (SSR, private mode quota exceeded) — fail silently
  }
}

/**
 * Reads the persisted session from localStorage.
 * Returns null if:
 * - Nothing is stored
 * - The stored date is not today (session expired)
 * - The stored data is malformed
 */
export function loadInventorySession(): InventorySession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: PersistedSession = JSON.parse(raw);
    if (parsed.date !== dateStrings.today()) return null;

    return parsed.session ?? null;
  } catch {
    return null;
  }
}

/**
 * Removes the persisted session from localStorage.
 * Called after a successful save to the server so the session doesn't
 * re-populate after the user has already committed the check.
 */
export function clearInventorySession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // fail silently
  }
}
