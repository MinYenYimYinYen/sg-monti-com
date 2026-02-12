import { SearchCriteriaRaw, RawData } from "../types/SearchScheme";
import { rgSearch } from "@/app/realGreen/_lib/api/rgSearchApi";

type FetchResult<TRawData> = {
  items: TRawData;
  duration: number;
};

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
 * @param baseSearchCriteria - The search criteria without offset/records
 * @param errorOffset - The offset where the error occurred
 * @param batchSize - The batch size that caused the error
 * @returns Generator that yields all valid records, skipping only the corrupted one
 */
export async function* binarySearchCorruptedRecord<TRawData extends RawData>(
  baseSearchCriteria: SearchCriteriaRaw,
  errorOffset: number,
  batchSize: number,
): AsyncGenerator<FetchResult<TRawData>> {
  console.log(`[binaryOffsetSearch] Starting binary search for corrupted record at offset ${errorOffset} with batch size ${batchSize}`);

  // Phase 1: Binary search to isolate the corrupted record
  let corruptedOffset = await findCorruptedOffset(
    baseSearchCriteria,
    errorOffset,
    batchSize,
  );

  console.log(`[binaryOffsetSearch] Corrupted record isolated at offset: ${corruptedOffset}`);

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
        yield { items: items as TRawData, duration };
      }
    } catch (error) {
      console.error(`[binaryOffsetSearch] Unexpected error fetching records before corrupted record:`, error);
      // This shouldn't happen, but if it does, we need to recursively handle it
      yield* binarySearchCorruptedRecord(baseSearchCriteria, errorOffset, recordsBeforeCorrupted);
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
        yield { items: items as TRawData, duration };
      }
    } catch (error) {
      console.error(`[binaryOffsetSearch] Another corrupted record found after offset ${corruptedOffset}:`, error);
      // Recursively handle if there's another corrupted record
      yield* binarySearchCorruptedRecord(baseSearchCriteria, afterOffset, remainingRecords);
    }
  }

  console.log(`[binaryOffsetSearch] Completed binary search recovery for offset ${errorOffset}`);
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
