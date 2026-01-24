import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

/**
 * Calculates the next optimal batch size based on the response density.
 *
 * Strategy:
 * We want to maximize the number of records returned per call without hitting the
 * hard limit (CustProgServRecordsMax) too often, as that indicates we might be missing data (overflow).
 *
 * If we are getting close to the limit (TARGET_RESPONSE_RATIO = 0.9), we reduce the batch size.
 * If we are getting very few records, we increase the batch size to reduce the number of HTTP calls.
 */
export function calculateNextBatchSize(
  currentBatchSize: number,
  maxRecordsFound: number
): { batchSize: number; lastMaxResponseSize: number } {
  const TARGET_RESPONSE_RATIO = 0.9;
  const TARGET_RECORDS = realGreenConst.CustProgServRecordsMax * TARGET_RESPONSE_RATIO;

  let newBatchSize = currentBatchSize;

  if (maxRecordsFound > 0) {
    // If we found records, adjust based on density
    // Example: We want 450 records. We got 225. Ratio = 2.
    // New Batch Size = Current * 2.
    // Example: We want 450 records. We got 500 (overflow). Ratio = 0.9.
    // New Batch Size = Current * 0.9.
    const ratio = TARGET_RECORDS / maxRecordsFound;
    newBatchSize = Math.floor(currentBatchSize * ratio);
  } else {
    // Aggressive ramp up if no records found (safe to increase)
    newBatchSize = currentBatchSize * 2;
  }

  // Clamp values to reasonable limits
  // Min 1: Must request at least 1 ID
  // Max 1000: Arbitrary safety limit to prevent massive URL lengths or timeouts
  newBatchSize = Math.max(1, Math.min(newBatchSize, 1000));

  return {
    batchSize: newBatchSize,
    lastMaxResponseSize: maxRecordsFound,
  };
}

/**
 * Calculates the next pagination estimate.
 *
 * Strategy:
 * For pagination, we simply track the total number of records found in the previous run.
 * This allows the next run to estimate the number of pages needed (Total / PageSize).
 */
export function calculateNextPagination(totalRecords: number): { initialPageCount: number } {
  // Calculate pages needed based on total records found
  const pagesNeeded = Math.ceil(totalRecords / realGreenConst.CustProgServRecordsMax);

  // Ensure at least 1 page is requested next time
  const initialPageCount = Math.max(1, pagesNeeded);

  return { initialPageCount };
}
