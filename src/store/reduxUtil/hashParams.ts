/**
 * Utility for creating deterministic hash strings from parameters.
 * Used to track concurrent requests with different params in uiSlice.
 */

/**
 * Stable JSON stringify that ensures consistent ordering of object keys.
 * This guarantees that logically equal objects produce the same hash.
 *
 * @param obj - The value to stringify
 * @returns Deterministic JSON string representation
 */
function stableStringify<T>(obj: T): string {
  if (obj === null) return "null";
  if (obj === undefined) return "undefined";
  if (typeof obj !== "object") return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }

  // Sort object keys for deterministic output
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => `"${k}":${stableStringify((obj as any)[k])}`);
  return "{" + pairs.join(",") + "}";
}

/**
 * Creates a short hash string from parameters using the djb2 algorithm.
 * Hash is deterministic - same params always produce same hash.
 *
 * @param params - The parameters to hash (objects, arrays, primitives, etc.)
 * @returns A 7-character base36 hash string (e.g., "1rj8k2a")
 *
 * @example
 * hashParams({ serviceIds: [1, 2, 3] })           // "1rj8k2a"
 * hashParams({ serviceIds: [] })                  // "5kg9a1b"
 * hashParams({ serviceIds: [1, 2, 3], foo: "bar" }) // "2mk3n4c"
 */
export function hashParams<T>(params: T): string {
  const json = stableStringify(params);

  // djb2 hash algorithm (fast and good distribution)
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = (hash << 5) + hash + json.charCodeAt(i); // hash * 33 + c
  }

  // Convert to base36 for shorter string, take first 7 chars
  // 7 chars in base36 = 36^7 = ~78 billion combinations
  return Math.abs(hash).toString(36).substring(0, 7);
}

/**
 * Creates a request ID by combining typePrefix with param hash.
 * Format: "typePrefix-hash"
 *
 * @param typePrefix - The thunk type prefix (e.g., "employee/getAll")
 * @param params - The parameters to hash
 * @returns Request ID string (e.g., "employee/getAll-1rj8k2a")
 */
export function createRequestId<T>(typePrefix: string, params: T): string {
  const hash = hashParams(params);
  return `${typePrefix}-${hash}`;
}

/**
 * Parses a request ID into its typePrefix and hash components.
 *
 * @param requestId - The request ID to parse (e.g., "employee/getAll-1rj8k2a")
 * @returns Object with typePrefix and hash, or null if invalid format
 */
export function parseRequestId(requestId: string): {
  typePrefix: string;
  hash: string;
} | null {
  // Match everything before the last hyphen as typePrefix, last part as hash
  const match = requestId.match(/^(.+)-([^-]+)$/);
  if (!match) return null;

  return {
    typePrefix: match[1],
    hash: match[2],
  };
}
