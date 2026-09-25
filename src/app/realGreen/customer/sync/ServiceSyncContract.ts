import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";

export interface ServiceSyncContract extends ApiContract {
  /**
   * Triggers a service sync from RealGreen to MongoDB.
   *
   * - Delta sync (default): fetches only records updated since `lastSyncedAt`.
   * - Full sync (`force: true`): ignores `lastSyncedAt` and fetches all records.
   *
   * For the initial full sync, services are filtered to `serviceYear >= currentYear - 7`
   * to limit volume. Use `force: true` for the first run.
   *
   * Returns the count of synced records and the new `lastSyncedAt` timestamp.
   */
  syncServices: {
    params: {
      /** If true, ignores lastSyncedAt and performs a full reload of all records. */
      force?: boolean;
    };
    result: DataResponse<{ synced: number; lastSyncedAt: string }>;
  };
}
