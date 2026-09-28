import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { getLastSyncedAt, setLastSyncedAt } from "@/app/realGreen/syncMetadata/syncMetadataFunc";
import { SYNC_ENTITY_TYPES } from "@/app/realGreen/syncMetadata/syncEntityTypes";
import { remapCustSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapCustSearch";
import { remapProgSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapProgSearch";
import { remapServSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapServSearch";
import { fetchCustomers, bulkUpsertCustomers } from "@/app/realGreen/customer/sync/customerSyncFunc";
import { fetchPrograms, bulkUpsertPrograms } from "@/app/realGreen/customer/sync/programSyncFunc";
import { fetchServices, bulkUpsertServices } from "@/app/realGreen/customer/sync/serviceSyncFunc";
import { CustStat } from "@/app/realGreen/_lib/subTypes/RGSearchRanges";

const ALL_CUST_STATS: CustStat[] = ["M", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const SEASON_FLOOR = new Date().getFullYear() - 7;
const SEASON_CEIL = new Date().getFullYear() + 7;

async function syncCustomers(): Promise<void> {
  const lastSyncedAt = await getLastSyncedAt(SYNC_ENTITY_TYPES.customer);
  const criteria = lastSyncedAt
    ? { statuses: ALL_CUST_STATS, updated: { min: lastSyncedAt, max: new Date().toISOString() } }
    : { statuses: ALL_CUST_STATS };
  const rawSearch = remapCustSearch(criteria);
  const rawCustomers = await fetchCustomers(rawSearch);
  await setLastSyncedAt(SYNC_ENTITY_TYPES.customer, new Date().toISOString());
  await bulkUpsertCustomers(rawCustomers);
}

async function syncPrograms(): Promise<void> {
  const lastSyncedAt = await getLastSyncedAt(SYNC_ENTITY_TYPES.program);
  const criteria = lastSyncedAt
    ? { updated: { min: lastSyncedAt, max: new Date().toISOString() }, season: { min: SEASON_FLOOR, max: SEASON_CEIL } }
    : { season: { min: SEASON_FLOOR, max: SEASON_CEIL } };
  const rawSearch = remapProgSearch(criteria as Parameters<typeof remapProgSearch>[0]);
  const rawPrograms = await fetchPrograms(rawSearch);
  await setLastSyncedAt(SYNC_ENTITY_TYPES.program, new Date().toISOString());
  await bulkUpsertPrograms(rawPrograms);
}

async function syncServices(): Promise<void> {
  const lastSyncedAt = await getLastSyncedAt(SYNC_ENTITY_TYPES.service);
  const criteria = lastSyncedAt
    ? { updated: { min: lastSyncedAt, max: new Date().toISOString() }, season: { min: SEASON_FLOOR, max: SEASON_CEIL } }
    : { season: { min: SEASON_FLOOR, max: SEASON_CEIL } };
  const rawSearch = remapServSearch(criteria);
  const rawServices = await fetchServices(rawSearch);
  await setLastSyncedAt(SYNC_ENTITY_TYPES.service, new Date().toISOString());
  await bulkUpsertServices(rawServices);
}

/**
 * Runs a delta sync for all three entity types (customers, programs, services) concurrently.
 *
 * Each entity fetches only records updated since its last sync timestamp (delta sync).
 * If no sync has run before, performs a full load.
 *
 * Called at the start of every getMirrorCustomers request to ensure the mirror
 * collections are up to date before executing the query plan.
 */
export async function runDeltaSync(): Promise<void> {
  await connectToMongoDB();
  console.log("[mirror] Running delta sync before query...");
  const start = Date.now();
  await Promise.all([syncCustomers(), syncPrograms(), syncServices()]);
  console.log(`[mirror] Delta sync complete in ${Date.now() - start}ms`);
}
