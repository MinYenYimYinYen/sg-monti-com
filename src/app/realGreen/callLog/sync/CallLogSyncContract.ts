import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";

export interface CallLogSyncContract extends ApiContract {
  /**
   * Triggers a call log sync from RealGreen to MongoDB.
   *
   * - Delta sync (default): fetches only records updated since `lastSyncedAt`.
   * - Full sync (`force: true`): ignores `lastSyncedAt` and fetches all records.
   *
   * Returns the count of synced records and the new `lastSyncedAt` timestamp.
   */
  syncCallLogs: {
    params: {
      /** If true, ignores lastSyncedAt and performs a full reload of all records. */
      force?: boolean;
    };
    result: DataResponse<{ synced: number; lastSyncedAt: string }>;
  };
}
