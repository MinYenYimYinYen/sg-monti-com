export type CorruptedEntityType = "customer" | "program" | "service";

/**
 * Captured once per corrupted record encountered during a binary search recovery.
 * The binary search functions accumulate these into an array (since a single search
 * can encounter multiple corrupted records via recursion) and return the array to
 * the sync func caller.
 *
 * `timestamp` is generated once at the start of a sync operation and shared across
 * all hits in that operation — the UI groups by timestamp to show all corruptions
 * found in a single sync run.
 */
export type CorruptedContext = {
  corruptedContextId: string;
  entityType: CorruptedEntityType;
  /** Natural key (servId / progId / custId) of the record immediately before the gap. */
  entityBeforeId: number | null;
  /** Natural key (servId / progId / custId) of the record immediately after the gap. */
  entityAfterId: number | null;
  /** ISO 8601 — identical for all hits in one sync operation. */
  timestamp: string;
};

/**
 * Persisted shape stored in MongoDB. Append-only — no natural key.
 * MongoDB `_id` is the document identifier.
 */
export type CorruptedSyncRecord = CorruptedContext;
