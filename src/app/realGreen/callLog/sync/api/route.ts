import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";
import { CallLogSyncContract } from "@/app/realGreen/callLog/sync/CallLogSyncContract";
import { remapCallLogSearch } from "@/app/realGreen/callLog/_lib/remapCallLogSearch";
import { fetchCallLogs, bulkUpsertCallLogs, findCallLogSyncEdge } from "@/app/realGreen/callLog/sync/callLogSyncFunc";
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
      const syncStart = new Date();

      const criteria = lastSyncedAt
        ? { updated: { min: lastSyncedAt, max: syncStart.toISOString() } }
        : {};

      const rawSearch = remapCallLogSearch(criteria);

      // Paginated fetch from RealGreen using capped exponential batch algorithm.
      const rawLogs = await fetchCallLogs(rawSearch);

      // Bulk upsert to MongoDB — single command, keyed by callLogId.
      const synced = await bulkUpsertCallLogs(rawLogs);

      if (synced === 0) {
        const existingLastSyncedAt = lastSyncedAt ?? syncStart.toISOString();
        console.log(`[callLog sync] Sync complete — 0 records synced, lastSyncedAt unchanged: ${existingLastSyncedAt}`);
        return { success: true, payload: { synced: 0, lastSyncedAt: existingLastSyncedAt } };
      }

      // Compute the new lastSyncedAt from the max note date in the returned records.
      // This avoids the race condition of storing `now` — see callLogSyncFunc.ts for details.
      const edgeResult = findCallLogSyncEdge(rawLogs, syncStart);
      const newLastSyncedAt = edgeResult?.newLastSyncedAt ?? syncStart.toISOString();
      const bufferSeconds = edgeResult?.bufferSeconds ?? 0;

      await setLastSyncedAt(SYNC_ENTITY_TYPES.callLog, {
        lastSyncedAt: newLastSyncedAt,
        lastSyncCount: synced,
        lastSyncEdgeIterations: 0,
        lastSyncBufferSeconds: bufferSeconds,
      });

      console.log(
        `[callLog sync] Sync complete — ${synced} record${synced === 1 ? "" : "s"} synced, lastSyncedAt: ${newLastSyncedAt}`,
      );

      return { success: true, payload: { synced, lastSyncedAt: newLastSyncedAt } };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
