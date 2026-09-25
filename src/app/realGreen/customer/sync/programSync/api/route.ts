import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";
import { ProgramSyncContract } from "@/app/realGreen/customer/sync/ProgramSyncContract";
import { remapProgSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapProgSearch";
import { fetchPrograms, bulkUpsertPrograms } from "@/app/realGreen/customer/sync/programSyncFunc";
import { getLastSyncedAt, setLastSyncedAt } from "@/app/realGreen/syncMetadata/syncMetadataFunc";
import { SYNC_ENTITY_TYPES } from "@/app/realGreen/syncMetadata/syncEntityTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

const handlers: HandlerMap<ProgramSyncContract> = {
  syncPrograms: {
    roles: ["admin"],
    handler: async ({ force }) => {
      await connectToMongoDB();

      // Determine the sync window.
      // Delta sync: fetch only records updated since lastSyncedAt.
      // Full sync (force=true): fetch all records (no updated filter).
      const lastSyncedAt = force ? null : await getLastSyncedAt(SYNC_ENTITY_TYPES.program);

      // ProgramSearchCriteria.updated is TRange<string> — { min, max }
      const criteria = lastSyncedAt
        ? { updated: { min: lastSyncedAt, max: new Date().toISOString() } }
        : {};

      const rawSearch = remapProgSearch(criteria as Parameters<typeof remapProgSearch>[0]);

      // Paginated fetch from RealGreen using capped exponential batch algorithm.
      const rawPrograms = await fetchPrograms(rawSearch);

      // Bulk upsert to MongoDB — single command, keyed by progId.
      const synced = await bulkUpsertPrograms(rawPrograms);

      // Record the sync completion time.
      const newLastSyncedAt = new Date().toISOString();
      await setLastSyncedAt(SYNC_ENTITY_TYPES.program, newLastSyncedAt);

      console.log(
        `[program sync] Sync complete — ${synced} record${synced === 1 ? "" : "s"} synced, lastSyncedAt: ${newLastSyncedAt}`,
      );

      return { success: true, payload: { synced, lastSyncedAt: newLastSyncedAt } };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
