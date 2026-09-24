// ---------------------------------------------------------------------------
// localStorageUtils — safe, typed localStorage helpers.
//
// All functions handle:
//   - SSR (typeof window === "undefined" guard)
//   - Unavailable storage (private mode, quota exceeded) via silent try/catch
//   - JSON serialization/deserialization
//
// Expiry functions use a { value, expiresAt } envelope so the TTL is stored
// alongside the data and checked transparently on read.
// ---------------------------------------------------------------------------

type WithExpiry<T> = {
  value: T;
  expiresAt: string; // ISO timestamp
};

/** Reads a JSON value from localStorage. Returns `defaultValue` on any failure. */
export function readLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

/** Writes a JSON value to localStorage. Silently ignores failures. */
export function writeLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

/** Removes a key from localStorage. Silently ignores failures. */
export function removeLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage unavailable — silently ignore
  }
}

/**
 * Reads a value stored with an expiry envelope.
 * Returns `null` if the key is missing, the data is malformed, or the TTL has expired.
 * Automatically removes the key when expired.
 */
export function readLocalStorageWithExpiry<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as WithExpiry<T>;
    if (new Date(parsed.expiresAt) > new Date()) {
      return parsed.value;
    }
    // Expired — clean up
    localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

/**
 * Writes a value with an expiry envelope.
 * `expiryMonths` controls how many months from now the value expires.
 */
export function writeLocalStorageWithExpiry<T>(key: string, value: T, expiryMonths: number): void {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + expiryMonths);
  const envelope: WithExpiry<T> = { value, expiresAt: expiresAt.toISOString() };
  try {
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // localStorage unavailable — silently ignore
  }
}
