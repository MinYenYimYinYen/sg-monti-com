import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { CallLogSyncContract } from "@/app/realGreen/callLog/sync/CallLogSyncContract";
import { remapCallLogSearch } from "@/app/realGreen/callLog/_lib/remapCallLogSearch";
import { fetchCallLogs, bulkUpsertCallLogs } from "@/app/realGreen/callLog/sync/callLogSyncFunc";
import { getLastSyncedAt, setLastSyncedAt } from "@/app/realGreen/syncMetadata/syncMetadataFunc";
import { SYNC_ENTITY_TYPES } from "@/app/realGreen/syncMetadata/syncEntityTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

const handlers: HandlerMap<CallLogSyncContract> = {
  syncCallLogs: {
    roles: ["admin"],
    handler: async ({ force }) => {
      await connectToMongoDB();

      // Determine the sync window.
      // Delta sync: fetch only records updated since lastSyncedAt.
      // Full sync (force=true): fetch all records (no updated filter).
      const lastSyncedAt = force ? null : await getLastSyncedAt(SYNC_ENTITY_TYPES.callLog);

      const criteria = lastSyncedAt
        ? { updated: { min: lastSyncedAt, max: new Date().toISOString() } }
        : {};

      const rawSearch = remapCallLogSearch(criteria);

      // Paginated fetch from RealGreen using capped exponential batch algorithm.
      const rawLogs = await fetchCallLogs(rawSearch);

      // Bulk upsert to MongoDB — single command, keyed by callLogId.
      const synced = await bulkUpsertCallLogs(rawLogs);

      // Record the sync completion time.
      const newLastSyncedAt = new Date().toISOString();
      await setLastSyncedAt(SYNC_ENTITY_TYPES.callLog, newLastSyncedAt);

      console.log(
        `[callLog sync] Sync complete — ${synced} record${synced === 1 ? "" : "s"} synced, lastSyncedAt: ${newLastSyncedAt}`,
      );

      return { success: true, payload: { synced, lastSyncedAt: newLastSyncedAt } };
    },
  },
};

export const POST = createRpcHandler(handlers);
