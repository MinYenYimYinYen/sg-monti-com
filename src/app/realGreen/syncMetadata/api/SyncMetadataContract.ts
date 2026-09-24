import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { SyncMetadata } from "@/app/realGreen/syncMetadata/SyncMetadataTypes";

export interface SyncMetadataContract extends ApiContract {
  /**
   * Returns all sync metadata documents — one per entity type that has ever synced.
   * Used by the admin sync status page to display last-synced timestamps.
   */
  getAll: {
    params: {};
    result: DataResponse<SyncMetadata[]>;
  };
}
