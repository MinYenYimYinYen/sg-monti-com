import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";
import { CustomerSyncContract } from "@/app/realGreen/customer/sync/CustomerSyncContract";
import { remapCustSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapCustSearch";
import { fetchCustomers, bulkUpsertCustomers } from "@/app/realGreen/customer/sync/customerSyncFunc";
import { getLastSyncedAt, setLastSyncedAt } from "@/app/realGreen/syncMetadata/syncMetadataFunc";
import { SYNC_ENTITY_TYPES } from "@/app/realGreen/syncMetadata/syncEntityTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { CustStat } from "@/app/realGreen/_lib/subTypes/RGSearchRanges";

// All possible customer statuses — ensures the sync captures every customer
// regardless of status. statusArrayToStringRange encodes this as { minValue: "M", maxValue: "9" }.
const ALL_CUST_STATS: CustStat[] = ["M", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const handlers: HandlerMap<CustomerSyncContract> = {
  syncCustomers: {
    roles: ["admin"],
    handler: async ({ force }) => {
      await connectToMongoDB();

      // Determine the sync window.
      // Delta sync: fetch only records updated since lastSyncedAt.
      // Full sync (force=true): fetch all records (no updated filter).
      const lastSyncedAt = force ? null : await getLastSyncedAt(SYNC_ENTITY_TYPES.customer);

      const criteria = lastSyncedAt
        ? { statuses: ALL_CUST_STATS, updated: { min: lastSyncedAt, max: new Date().toISOString() } }
        : { statuses: ALL_CUST_STATS };

      const rawSearch = remapCustSearch(criteria);

      console.log(`[customer sync] Search criteria:`, JSON.stringify(rawSearch, null, 2));

      // Paginated fetch from RealGreen using capped exponential batch algorithm.
      const rawCustomers = await fetchCustomers(rawSearch);

      // Record the sync timestamp before the bulkWrite so that delta syncs work correctly
      // even if the HTTP response times out during the upsert phase.
      const newLastSyncedAt = new Date().toISOString();
      await setLastSyncedAt(SYNC_ENTITY_TYPES.customer, newLastSyncedAt);

      // Bulk upsert to MongoDB — single command, keyed by custId.
      const synced = await bulkUpsertCustomers(rawCustomers);

      console.log(
        `[customer sync] Sync complete — ${synced} record${synced === 1 ? "" : "s"} synced, lastSyncedAt: ${newLastSyncedAt}`,
      );

      return { success: true, payload: { synced, lastSyncedAt: newLastSyncedAt } };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
