import { rgHttp } from "@/app/realGreen/_lib/api/rgHttp";
import {
  SyncEntityType,
  SYNC_ENTITY_TYPES,
} from "@/app/realGreen/syncMetadata/syncEntityTypes";

// ---------------------------------------------------------------------------
// Constants (tunable)
// ---------------------------------------------------------------------------

/** Stop splitting when the remaining window is smaller than this. */
const GRANULARITY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Hard cap on Reporting API calls per sync.
 * log₂(7 years / 10 min) ≈ 19, so 25 provides a safe margin.
 * This prevents runaway API usage on a metered endpoint.
 */
const MAX_ITERATIONS = 25;

/**
 * Subtracted from the discovered edge before storing as `lastSyncedAt`.
 * Covers RealGreen's indexing lag — records modified near the edge may not
 * yet be visible in the search API when the binary search runs.
 * Tune based on observed behavior.
 */
export const COMFORT_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Reporting API
// ---------------------------------------------------------------------------

type ReportingUpdatedBody = {
  dateTimeRange: {
    minValue: string;
    maxValue: string;
  };
};

function getReportingPath(entityType: SyncEntityType): string {
  switch (entityType) {
    case SYNC_ENTITY_TYPES.customer:
      return "/Reporting/Customer/Updated";
    case SYNC_ENTITY_TYPES.program:
      return "/Reporting/Program/Updated";
    case SYNC_ENTITY_TYPES.service:
      return "/Reporting/Service/Updated";
    default:
      // callLog and any future entity types don't have a Reporting endpoint
      throw new Error(
        `No Reporting/Updated endpoint for entity type: ${entityType}`,
      );
  }
}

/**
 * Calls the RealGreen Reporting/[Entity]/Updated endpoint for the given time window.
 * Returns the array of entity IDs updated within [minDate, maxDate].
 *
 * This is a cheap POST that returns only IDs — no pagination, no full record data.
 */
async function getUpdatedIds(
  entityType: SyncEntityType,
  minDate: Date,
  maxDate: Date,
): Promise<number[]> {
  const path = getReportingPath(entityType);
  const body: ReportingUpdatedBody = {
    dateTimeRange: {
      minValue: minDate.toISOString(),
      maxValue: maxDate.toISOString(),
    },
  };
  return rgHttp<number[]>(
    path,
    { method: "POST", body: body as unknown as BodyInit },
    path,
  );
}

// ---------------------------------------------------------------------------
// Binary Search Edge Finder
// ---------------------------------------------------------------------------

export type FindSyncEdgeResult = {
  /** The new lastSyncedAt to store (edge timestamp minus comfort buffer). */
  newLastSyncedAt: string;
  /** How many Reporting API calls were made. */
  iterations: number;
  /** Whether the edge was found (true) or the window was already empty (false = nothing changed). */
  edgeFound: boolean;
};

/**
 * Finds the latest timestamp `T*` such that `Reporting(T*, hi)` returns an empty array,
 * using binary search on the RealGreen Reporting/[Entity]/Updated endpoint.
 *
 * This is the "true edge" — the latest point after which no records are known to have
 * been updated. Storing `T* - COMFORT_BUFFER` as `lastSyncedAt` ensures the next sync
 * re-queries slightly before the edge, catching any records that were modified near `T*`
 * but not yet indexed by RealGreen when this search ran.
 *
 * **Algorithm:**
 * ```
 * lo = loDate, hi = hiDate
 * while (hi - lo) > GRANULARITY AND iterations < MAX_ITERATIONS:
 *   mid = (lo + hi) / 2
 *   rightIds = Reporting(mid, hi)
 *   if rightIds.empty: break        // lo is the answer
 *   else: lo = mid                  // advance lo into the right half
 * newLastSyncedAt = lo - COMFORT_BUFFER
 * ```
 *
 * **Call count:** log₂(range / GRANULARITY), capped at MAX_ITERATIONS.
 * - Normal sync (5 min range): ~1–2 calls
 * - Initial sync (7 year range): ~22 calls
 *
 * @param entityType - The sync entity type (customer, program, service)
 * @param loDate - The lower bound (previous lastSyncedAt, or HISTORY_FLOOR for initial sync)
 * @param hiDate - The upper bound (now)
 * @returns The new lastSyncedAt to store, iteration count, and whether an edge was found
 */
export async function findSyncEdge(
  entityType: SyncEntityType,
  loDate: Date,
  hiDate: Date,
): Promise<FindSyncEdgeResult> {
  let lo = loDate.getTime();
  const hi = hiDate.getTime();
  let iterations = 0;

  // First check: if nothing changed in the entire window, skip the search entirely.
  // This is the common case on quiet days and costs only 1 API call.
  const initialIds = await getUpdatedIds(
    entityType,
    new Date(lo),
    new Date(hi),
  );
  iterations++;

  if (initialIds.length === 0) {
    // Nothing changed — do not advance lastSyncedAt
    console.log(
      `[findSyncEdge:${entityType}] No updates in window — lastSyncedAt unchanged`,
    );
    return {
      newLastSyncedAt: loDate.toISOString(),
      iterations,
      edgeFound: false,
    };
  }

  // Binary search: advance lo until the right half is empty or window < GRANULARITY
  while (hi - lo > GRANULARITY_MS && iterations < MAX_ITERATIONS) {
    const mid = Math.floor((lo + hi) / 2);
    const rightIds = await getUpdatedIds(
      entityType,
      new Date(mid),
      new Date(hi),
    );
    iterations++;

    if (rightIds.length === 0) {
      // No records in [mid, hi] — the edge is at or before mid. lo is our answer.
      break;
    } else {
      // Records exist in [mid, hi] — advance lo into the right half
      lo = mid;
    }
  }

  // lo is the latest known point with records.
  // Subtract comfort buffer to ensure the next sync re-queries slightly before this point.
  const edgeMs = lo - COMFORT_BUFFER_MS;
  const newLastSyncedAt = new Date(edgeMs).toISOString();

  console.log(
    `[findSyncEdge:${entityType}] Edge found after ${iterations} call${iterations === 1 ? "" : "s"} — ` +
      `new lastSyncedAt: ${newLastSyncedAt}`,
  );

  return {
    newLastSyncedAt,
    iterations,
    edgeFound: true,
  };
}
