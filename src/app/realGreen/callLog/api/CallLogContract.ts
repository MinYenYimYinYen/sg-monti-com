import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { CallLogCore } from "@/app/realGreen/callLog/CallLogTypes";

export interface CallLogContract extends ApiContract {
  /**
   * Fetches all call logs for a single customer directly from the RealGreen API.
   * Pass-through only — no Mongo persistence. Use for UI queries and sandbox exploration.
   * Sync/persistence is handled separately in the callLog sync layer (see callLogSyncPlan.md).
   */
  getCallLogsForCustomer: {
    params: { custId: number };
    result: DataResponse<CallLogCore[]>;
  };
}
