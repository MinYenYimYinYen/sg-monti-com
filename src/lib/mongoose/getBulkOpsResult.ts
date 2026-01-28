import { BulkWriteResult } from "mongodb";
import { DataResponse, ErrorResponse } from "@/lib/api/types/responses";

/**
 * Wraps a MongoDB bulk operation promise to standardize the output.
 * Catches MongoBulkWriteError to summarize specific write failures.
 */
export async function getBulkOpsResult(
  bulkOp: Promise<BulkWriteResult>
): Promise<DataResponse<BulkWriteResult> | ErrorResponse<null>> {
  try {
    const result = await bulkOp;
    return {
      success: true,
      payload: result,
    };
  } catch (e: any) {
    // Check for MongoDB Bulk Write Error
    if (e.name === "MongoBulkWriteError" && e.writeErrors) {
      // Summarize the first 3 errors to avoid a massive error string
      const errorCount = e.writeErrors.length;
      const summary = e.writeErrors
        .slice(0, 3)
        .map((err: any) => `[Idx ${err.index}]: ${err.errmsg}`)
        .join("; ");

      const message = `Bulk op failed with ${errorCount} errors. Details: ${summary}${
        errorCount > 3 ? "..." : ""
      }`;

      return {
        success: false,
        message,
      };
    }

    // Fallback for generic errors
    return {
      success: false,
      message: e.message || "Unknown error occurred during bulk operation",
    };
  }
}