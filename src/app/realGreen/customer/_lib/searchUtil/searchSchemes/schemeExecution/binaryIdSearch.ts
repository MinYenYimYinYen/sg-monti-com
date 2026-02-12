import { SearchCriteria, SearchCriteriaRaw, RawData } from "../types/SearchScheme";
import { rgSearch } from "@/app/realGreen/_lib/api/rgSearchApi";

type FetchResult<TRawData> = {
  items: TRawData;
  duration: number;
};

/**
 * When we hit a corrupted record while searching by IDs (e.g., progIds, custIds),
 * this function uses binary search to isolate which specific ID causes the error,
 * then fetches all valid records, skipping only the problematic ID.
 *
 * Strategy:
 * 1. Binary search on the ID array to find the corrupted ID
 * 2. Fetch all records for IDs before the corrupted ID
 * 3. Skip the corrupted ID
 * 4. Fetch all records for IDs after the corrupted ID
 *
 * @param ids - The array of IDs that caused the error
 * @param getSearchCriteria - Function to build search criteria from an ID array
 * @param mapCriteria - Function to map SearchCriteria to SearchCriteriaRaw
 * @returns Generator that yields all valid records, skipping only the corrupted ID's data
 */
export async function* binarySearchCorruptedId<TRawData extends RawData>(
  ids: number[],
  getSearchCriteria: (ids: number[]) => SearchCriteria,
  mapCriteria: (criteria: SearchCriteria) => SearchCriteriaRaw,
): AsyncGenerator<FetchResult<TRawData>> {
  console.log(`[binaryIdSearch] Starting binary search for corrupted ID in array of ${ids.length} IDs`);
  console.log(`[binaryIdSearch] ID range: [${ids[0]}, ..., ${ids[ids.length - 1]}]`);

  // Phase 1: Binary search to isolate the corrupted ID
  const corruptedIdIndex = await findCorruptedIdIndex(
    ids,
    getSearchCriteria,
    mapCriteria,
  );

  const corruptedId = ids[corruptedIdIndex];
  console.log(`[binaryIdSearch] Corrupted ID isolated: ${corruptedId} at index ${corruptedIdIndex}`);

  // Phase 2: Fetch all records for IDs before the corrupted ID
  if (corruptedIdIndex > 0) {
    const idsBeforeCorrupted = ids.slice(0, corruptedIdIndex);
    console.log(`[binaryIdSearch] Fetching records for ${idsBeforeCorrupted.length} IDs before corrupted ID`);

    const start = Date.now();
    const searchCriteria = getSearchCriteria(idsBeforeCorrupted);
    const rawCriteria = mapCriteria(searchCriteria);

    try {
      const res = await rgSearch<TRawData>(rawCriteria);
      const items = (res as any)?.items || (Array.isArray(res) ? res : []);
      const duration = Date.now() - start;

      if (items && items.length > 0) {
        console.log(`[binaryIdSearch] Successfully fetched ${items.length} records before corrupted ID`);
        yield { items: items as TRawData, duration };
      }
    } catch (error) {
      console.error(`[binaryIdSearch] Unexpected error fetching records before corrupted ID:`, error);
      // Recursively handle if there's another corrupted ID in this subset
      yield* binarySearchCorruptedId(idsBeforeCorrupted, getSearchCriteria, mapCriteria);
    }
  }

  // Phase 3: Skip the corrupted ID
  console.log(`[binaryIdSearch] Skipping corrupted ID: ${corruptedId}`);

  // TODO: Capture bad program data for investigation
  // Future enhancement: When a corrupted ID is found, look up the program's progCode and custId
  // from the pipelineData to identify the record in RealGreen CRM for manual investigation/fixing.
  // This will require passing pipelineData to this function and cross-referencing the corrupted ID.

  // Phase 4: Fetch all records for IDs after the corrupted ID
  if (corruptedIdIndex < ids.length - 1) {
    const idsAfterCorrupted = ids.slice(corruptedIdIndex + 1);
    console.log(`[binaryIdSearch] Fetching records for ${idsAfterCorrupted.length} IDs after corrupted ID`);

    const start = Date.now();
    const searchCriteria = getSearchCriteria(idsAfterCorrupted);
    const rawCriteria = mapCriteria(searchCriteria);

    try {
      const res = await rgSearch<TRawData>(rawCriteria);
      const items = (res as any)?.items || (Array.isArray(res) ? res : []);
      const duration = Date.now() - start;

      if (items && items.length > 0) {
        console.log(`[binaryIdSearch] Successfully fetched ${items.length} records after corrupted ID`);
        yield { items: items as TRawData, duration };
      }
    } catch (error) {
      console.error(`[binaryIdSearch] Another corrupted ID found after ${corruptedId}:`, error);
      // Recursively handle if there's another corrupted ID in this subset
      yield* binarySearchCorruptedId(idsAfterCorrupted, getSearchCriteria, mapCriteria);
    }
  }

  console.log(`[binaryIdSearch] Completed binary search recovery. Skipped ID: ${corruptedId}`);
}

/**
 * Uses binary search to find the index of the corrupted ID in the array.
 *
 * Algorithm:
 * - Start with the known ID array that causes an error
 * - Split in half and test the second half
 * - If success, corrupted ID is in the first half
 * - If failure, corrupted ID is in the second half
 * - Repeat until we narrow down to a single ID
 *
 * @returns The index in the array of the corrupted ID
 */
async function findCorruptedIdIndex(
  ids: number[],
  getSearchCriteria: (ids: number[]) => SearchCriteria,
  mapCriteria: (criteria: SearchCriteria) => SearchCriteriaRaw,
): Promise<number> {
  let left = 0;
  let right = ids.length - 1;

  console.log(`[binaryIdSearch] Binary search on ID array. Array length: ${ids.length}`);

  while (left < right) {
    const mid = Math.floor((left + right) / 2);

    // Test the second half [mid+1, right]
    const testIds = ids.slice(mid + 1, right + 1);
    console.log(`[binaryIdSearch] Testing ${testIds.length} IDs from index ${mid + 1} to ${right}`);
    console.log(`[binaryIdSearch] Test IDs: [${testIds[0]}, ..., ${testIds[testIds.length - 1]}]`);

    try {
      const searchCriteria = getSearchCriteria(testIds);
      const rawCriteria = mapCriteria(searchCriteria);
      await rgSearch(rawCriteria);

      // Success! Corrupted ID is in first half [left, mid]
      console.log(`[binaryIdSearch] Success! Corrupted ID is in first half (indices ${left} to ${mid})`);
      right = mid;
    } catch (error) {
      // Failure! Corrupted ID is in second half [mid+1, right]
      console.log(`[binaryIdSearch] Error! Corrupted ID is in second half (indices ${mid + 1} to ${right})`);
      left = mid + 1;
    }
  }

  console.log(`[binaryIdSearch] Isolated corrupted ID at index: ${left}, ID: ${ids[left]}`);
  return left;
}
