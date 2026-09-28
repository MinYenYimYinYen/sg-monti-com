import { SearchCriteriaRaw, RawData } from "../types/SearchScheme";
import { rgSearch } from "@/app/realGreen/_lib/api/rgSearchApi";
import { CorruptedContext, CorruptedEntityType } from "@/app/realGreen/customer/sync/corruptedRecords/CorruptedSyncRecordTypes";

type FetchResult<TRawData> = {
  items: TRawData;
  duration: number;
};

type BinaryOffsetSearchResult<TRawData> = {
  results: FetchResult<TRawData>[];
  corruptedContexts: CorruptedContext[];
};

/**
 * Extracts the natural key (id field) from the last item in a raw data array.
 * Returns null if the array is empty or the item has no id.
 */
function extractLastId(items: unknown[]): number | null {
  if (items.length === 0) return null;
  const last = items[items.length - 1] as Record<string, unknown>;
  return typeof last["id"] === "number" ? last["id"] : null;
}

/**
 * Extracts the natural key (id field) from the first item in a raw data array.
 * Returns null if the array is empty or the item has no id.
 */
function extractFirstId(items: unknown[]): number | null {
  if (items.length === 0) return null;
  const first = items[0] as Record<string, unknown>;
  return typeof first["id"] === "number" ? first["id"] : null;
}

/**
 * When we hit a corrupted record in a batch, this function uses binary search
 * to isolate the exact position of the corrupted record, then fetches all
 * valid records around it, skipping only the single corrupted record.
 *
 * Strategy:
 * 1. Binary search to find the exact offset of the corrupted record
 * 2. Fetch all records before the corrupted record
 * 3. Skip the corrupted record (1 record)
 * 4. Fetch all records after the corrupted record in the original batch
 *
 * Returns all recovered fetch results AND an array of CorruptedContext objects
 * (one per corrupted record encountered, including recursive calls).
 *
 * Neighbor ID accumulation (reduce-style):
 * `lastKnownBeforeId` and `lastKnownAfterId` carry forward the best known
 * neighbor context as recursion narrows the range. When a phase is skipped
 * (corrupted record at the boundary of the current range) or fails (another
 * corrupted record in that sub-range), the inherited context fills the gap.
 *
 * @param baseSearchCriteria - The search criteria without offset/records
 * @param errorOffset - The offset where the error occurred
 * @param batchSize - The batch size that caused the error
 * @param entityType - The entity type being synced (for CorruptedContext)
 * @param timestamp - Shared ISO timestamp for all hits in one sync operation
 * @param accumulatedContexts - Internal accumulator for recursive calls
 * @param lastKnownBeforeId - Best known ID immediately before this range (from outer call)
 * @param lastKnownAfterId - Best known ID immediately after this range (from outer call)
 */
export async function binarySearchCorruptedRecord<TRawData extends RawData>(
  baseSearchCriteria: SearchCriteriaRaw,
  errorOffset: number,
  batchSize: number,
  entityType?: CorruptedEntityType,
  timestamp?: string,
  accumulatedContexts: CorruptedContext[] = [],
  lastKnownBeforeId: number | null = null,
  lastKnownAfterId: number | null = null,
): Promise<BinaryOffsetSearchResult<TRawData>> {
  console.log(`[binaryOffsetSearch] Starting binary search for corrupted record at offset ${errorOffset} with batch size ${batchSize}`);

  const results: FetchResult<TRawData>[] = [];

  // Phase 1: Binary search to isolate the corrupted record
  const corruptedOffset = await findCorruptedOffset(
    baseSearchCriteria,
    errorOffset,
    batchSize,
  );

  console.log(`[binaryOffsetSearch] Corrupted record isolated at offset: ${corruptedOffset}`);
  console.warn(
    `[sync] ⚠ Corrupted record skipped — entity: ${(baseSearchCriteria as any).searchType ?? "unknown"}, offset: ${corruptedOffset}`,
  );

  // Start with the inherited context from the outer call.
  // These will be overwritten if we successfully fetch records in Phase 2/4.
  let entityBeforeId: number | null = lastKnownBeforeId;
  let entityAfterId: number | null = lastKnownAfterId;

  // Phase 2: Fetch all records before the corrupted record
  if (corruptedOffset > errorOffset) {
    const recordsBeforeCorrupted = corruptedOffset - errorOffset;
    console.log(`[binaryOffsetSearch] Fetching ${recordsBeforeCorrupted} records before corrupted record`);

    const start = Date.now();
    const body = {
      ...baseSearchCriteria,
      records: recordsBeforeCorrupted,
      offset: errorOffset,
    };

    try {
      const res = await rgSearch<TRawData>(body);
      const items = (res as any)?.items || (Array.isArray(res) ? res : []);
      const duration = Date.now() - start;

      if (items && items.length > 0) {
        console.log(`[binaryOffsetSearch] Successfully fetched ${items.length} records before corrupted record`);
        entityBeforeId = extractLastId(items as unknown[]);
        results.push({ items: items as TRawData, duration });
      }
    } catch (error) {
      console.error(`[binaryOffsetSearch] Unexpected error fetching records before corrupted record:`, error);
      // Recursively handle if there's another corrupted record in the before range.
      // Pass entityAfterId as the inherited after context for the recursive call,
      // since the recursive call's range ends just before the current corrupted record.
      const subResult = await binarySearchCorruptedRecord<TRawData>(
        baseSearchCriteria,
        errorOffset,
        recordsBeforeCorrupted,
        entityType,
        timestamp,
        accumulatedContexts,
        lastKnownBeforeId,   // inherit the outer before context
        entityAfterId,       // the current corrupted record is "after" the sub-range
      );
      results.push(...subResult.results);
      // Update entityBeforeId from the last record the recursive call recovered
      if (subResult.results.length > 0) {
        const lastSubResult = subResult.results[subResult.results.length - 1];
        const lastId = extractLastId(lastSubResult.items as unknown[]);
        if (lastId !== null) entityBeforeId = lastId;
      }
    }
  }

  // Phase 3: Skip the corrupted record (offset corruptedOffset, 1 record)
  console.log(`[binaryOffsetSearch] Skipping corrupted record at offset ${corruptedOffset}`);

  // Phase 4: Fetch all records after the corrupted record
  const afterOffset = corruptedOffset + 1;
  const remainingRecords = (errorOffset + batchSize) - afterOffset;

  if (remainingRecords > 0) {
    console.log(`[binaryOffsetSearch] Fetching ${remainingRecords} records after corrupted record`);

    const start = Date.now();
    const body = {
      ...baseSearchCriteria,
      records: remainingRecords,
      offset: afterOffset,
    };

    try {
      const res = await rgSearch<TRawData>(body);
      const items = (res as any)?.items || (Array.isArray(res) ? res : []);
      const duration = Date.now() - start;

      if (items && items.length > 0) {
        console.log(`[binaryOffsetSearch] Successfully fetched ${items.length} records after corrupted record`);
        entityAfterId = extractFirstId(items as unknown[]);
        results.push({ items: items as TRawData, duration });
      }
    } catch (error) {
      console.error(`[binaryOffsetSearch] Another corrupted record found after offset ${corruptedOffset}:`, error);
      // Recursively handle if there's another corrupted record in the after range.
      // Pass entityBeforeId as the inherited before context for the recursive call,
      // since the recursive call's range starts just after the current corrupted record.
      const subResult = await binarySearchCorruptedRecord<TRawData>(
        baseSearchCriteria,
        afterOffset,
        remainingRecords,
        entityType,
        timestamp,
        accumulatedContexts,
        entityBeforeId,      // the current corrupted record is "before" the sub-range
        lastKnownAfterId,    // inherit the outer after context
      );
      results.push(...subResult.results);
      // Update entityAfterId from the first record the recursive call recovered
      if (subResult.results.length > 0) {
        const firstSubResult = subResult.results[0];
        const firstId = extractFirstId(firstSubResult.items as unknown[]);
        if (firstId !== null) entityAfterId = firstId;
      }
    }
  }

  // Record this corrupted encounter if we have entity type and timestamp context
  // (only present when called from a sync func, not from the live pipeline).
  // entityBeforeId and entityAfterId already incorporate the inherited context
  // from lastKnownBeforeId/lastKnownAfterId, so no additional fallback needed.
  if (entityType && timestamp) {
    accumulatedContexts.push({
      corruptedContextId: globalThis.crypto.randomUUID(),
      entityType,
      entityBeforeId,
      entityAfterId,
      timestamp,
    });
  }

  console.log(`[binaryOffsetSearch] Completed binary search recovery for offset ${errorOffset}`);

  return { results, corruptedContexts: accumulatedContexts };
}

/**
 * Uses binary search to find the exact offset of a corrupted record.
 *
 * Algorithm:
 * - Start with the known error offset and batch size
 * - Try fetching from midpoint forward
 * - If success, corrupted record is in the first half
 * - If failure, corrupted record is in the second half
 * - Repeat until we narrow down to a single record
 *
 * @returns The exact offset of the corrupted record
 */
async function findCorruptedOffset(
  baseSearchCriteria: SearchCriteriaRaw,
  errorOffset: number,
  batchSize: number,
): Promise<number> {
  let left = errorOffset;
  let right = errorOffset + batchSize - 1;

  console.log(`[binaryOffsetSearch] Binary search range: [${left}, ${right}]`);

  while (left < right) {
    // Try to narrow down by testing the midpoint
    const mid = Math.floor((left + right) / 2);
    const testOffset = mid + 1; // Start from after midpoint
    const testRecords = right - mid;

    console.log(`[binaryOffsetSearch] Testing range [${testOffset}, ${right}] (${testRecords} records)`);

    try {
      const body = {
        ...baseSearchCriteria,
        records: testRecords,
        offset: testOffset,
      };

      await rgSearch(body);

      // Success! Corrupted record is in first half [left, mid]
      console.log(`[binaryOffsetSearch] Success! Corrupted record is in first half [${left}, ${mid}]`);
      right = mid;
    } catch (error) {
      // Failure! Corrupted record is in second half [mid+1, right]
      console.log(`[binaryOffsetSearch] Error! Corrupted record is in second half [${testOffset}, ${right}]`);
      left = testOffset;
    }
  }

  console.log(`[binaryOffsetSearch] Isolated corrupted record at offset: ${left}`);
  return left;
}
