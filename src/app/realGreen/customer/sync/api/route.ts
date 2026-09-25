import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";
import { CustomerSyncContract } from "@/app/realGreen/customer/sync/CustomerSyncContract";
import { remapCustSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapCustSearch";
import { fetchCustomers, bulkUpsertCustomers } from "@/app/realGreen/customer/sync/customerSyncFunc";
import { getLastSyncedAt, setLastSyncedAt } from "@/app/realGreen/syncMetadata/syncMetadataFunc";
import { SYNC_ENTITY_TYPES } from "@/app/realGreen/syncMetadata/syncEntityTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

const handlers: HandlerMap<CustomerSyncContract> = {
  syncCustomers: {
    roles: ["admin"],
    handler: async ({ force }) => {
      await connectToMongoDB();

      // Determine the sync window.
      // Delta sync: fetch only records updated since lastSyncedAt.
      // Full sync (force=true): fetch all records (no updated filter).
      const lastSyncedAt = force ? null : await getLastSyncedAt(SYNC_ENTITY_TYPES.customer);

      // CustomerSearchCriteria.updated is TRange<string> — { min, max }
      const criteria = lastSyncedAt
        ? { updated: { min: lastSyncedAt, max: new Date().toISOString() } }
        : {};

      const rawSearch = remapCustSearch(criteria as Parameters<typeof remapCustSearch>[0]);

      // Paginated fetch from RealGreen using capped exponential batch algorithm.
      const rawCustomers = await fetchCustomers(rawSearch);

      // Bulk upsert to MongoDB — single command, keyed by custId.
      const synced = await bulkUpsertCustomers(rawCustomers);

      // Record the sync completion time.
      const newLastSyncedAt = new Date().toISOString();
      await setLastSyncedAt(SYNC_ENTITY_TYPES.customer, newLastSyncedAt);

      console.log(
        `[customer sync] Sync complete — ${synced} record${synced === 1 ? "" : "s"} synced, lastSyncedAt: ${newLastSyncedAt}`,
      );

      return { success: true, payload: { synced, lastSyncedAt: newLastSyncedAt } };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
