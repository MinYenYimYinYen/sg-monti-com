import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";
import { ServiceSyncContract } from "@/app/realGreen/customer/sync/ServiceSyncContract";
import { remapServSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapServSearch";
import { fetchServices, bulkUpsertServices } from "@/app/realGreen/customer/sync/serviceSyncFunc";
import { getLastSyncedAt, setLastSyncedAt } from "@/app/realGreen/syncMetadata/syncMetadataFunc";
import { SYNC_ENTITY_TYPES } from "@/app/realGreen/syncMetadata/syncEntityTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

// 7-year window in each direction: captures historical data and pre-planned future seasons.
const SEASON_FLOOR = new Date().getFullYear() - 7;
const SEASON_CEIL = new Date().getFullYear() + 7;

const handlers: HandlerMap<ServiceSyncContract> = {
  syncServices: {
    roles: ["admin"],
    handler: async ({ force }) => {
      await connectToMongoDB();

      // Determine the sync window.
      // Delta sync: fetch only records updated since lastSyncedAt.
      // Full sync (force=true): fetch all records within the season floor (no updated filter).
      const lastSyncedAt = force ? null : await getLastSyncedAt(SYNC_ENTITY_TYPES.service);

      const criteria = lastSyncedAt
        ? {
            updated: { min: lastSyncedAt, max: new Date().toISOString() },
            season: { min: SEASON_FLOOR, max: SEASON_CEIL },
          }
        : {
            season: { min: SEASON_FLOOR, max: SEASON_CEIL },
          };

      const rawSearch = remapServSearch(criteria);

      console.log(`[service sync] Search criteria:`, JSON.stringify(rawSearch, null, 2));

      // Paginated fetch from RealGreen using capped exponential batch algorithm.
      const rawServices = await fetchServices(rawSearch);

      // Record the sync timestamp before the bulkWrite so that delta syncs work correctly
      // even if the HTTP response times out during the upsert phase.
      const newLastSyncedAt = new Date().toISOString();
      await setLastSyncedAt(SYNC_ENTITY_TYPES.service, newLastSyncedAt);

      // Bulk upsert to MongoDB — single command, keyed by servId.
      // Corrupted production records are skipped and logged (not thrown).
      const synced = await bulkUpsertServices(rawServices);

      console.log(
        `[service sync] Sync complete — ${synced} record${synced === 1 ? "" : "s"} synced, lastSyncedAt: ${newLastSyncedAt}`,
      );

      return { success: true, payload: { synced, lastSyncedAt: newLastSyncedAt } };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
