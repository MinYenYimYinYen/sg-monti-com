import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { CorruptedSyncRecord } from "@/app/realGreen/customer/sync/corruptedRecords/CorruptedSyncRecordTypes";

export interface CorruptedSyncRecordContract extends ApiContract {
  /**
   * Fetches corrupted sync records from MongoDB.
   *
   * Params are not yet implemented — query shape will be designed when the
   * corrupted records investigation UI is built.
   *
   * TODO: Define params (e.g., entityType filter, timestamp range, pagination)
   */
  getCorruptedSyncRecords: {
    params: Record<string, never>;
    result: DataResponse<CorruptedSyncRecord[]>;
  };
}
