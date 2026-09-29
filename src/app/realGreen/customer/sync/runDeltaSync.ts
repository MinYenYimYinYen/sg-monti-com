import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { setLastSyncedAt } from "@/app/realGreen/syncMetadata/syncMetadataFunc";
import { getLastSyncedAt } from "@/app/realGreen/syncMetadata/syncMetadataFunc";
import { SYNC_ENTITY_TYPES, SyncEntityType } from "@/app/realGreen/syncMetadata/syncEntityTypes";
import { remapCustSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapCustSearch";
import { remapProgSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapProgSearch";
import { remapServSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapServSearch";
import { fetchCustomers, bulkUpsertCustomers } from "@/app/realGreen/customer/sync/customerSyncFunc";
import { fetchPrograms, bulkUpsertPrograms } from "@/app/realGreen/customer/sync/programSyncFunc";
import { fetchServices, bulkUpsertServices } from "@/app/realGreen/customer/sync/serviceSyncFunc";
import { CustStat } from "@/app/realGreen/_lib/subTypes/RGSearchRanges";
import { findSyncEdge, COMFORT_BUFFER_MS } from "@/app/realGreen/customer/sync/findSyncEdge";

const ALL_CUST_STATS: CustStat[] = ["M", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const SEASON_FLOOR = new Date().getFullYear() - 7;
const SEASON_CEIL = new Date().getFullYear() + 7;

/**
 * ISO 8601 string for the earliest date we consider in the sync history.
 * Used as the `lo` bound for `findSyncEdge` on the initial full sync.
 */
const HISTORY_FLOOR_ISO = `${SEASON_FLOOR}-01-01T00:00:00.000Z`;

// ---------------------------------------------------------------------------
// Sync Result
// ---------------------------------------------------------------------------

/**
 * Returned by each sync function. Contains the metadata to be written after
 * all three syncs complete. No DB writes happen inside the sync functions —
 * `runDeltaSync` batches all metadata writes at the end.
 */
type SyncResult = {
  entityType: SyncEntityType;
  /** The adjusted lastSyncedAt to store (edge - comfort buffer). Unchanged if count === 0. */
  lastSyncedAt: string;
  lastSyncCount: number;
  lastSyncEdgeIterations: number;
  lastSyncBufferSeconds: number;
};

// ---------------------------------------------------------------------------
// Individual Sync Functions
// ---------------------------------------------------------------------------

async function syncCustomers(): Promise<SyncResult> {
  const lastSyncedAt = await getLastSyncedAt(SYNC_ENTITY_TYPES.customer);
  const syncStart = new Date();

  const criteria = lastSyncedAt
    ? { statuses: ALL_CUST_STATS, updated: { min: lastSyncedAt, max: syncStart.toISOString() } }
    : { statuses: ALL_CUST_STATS };
  const rawSearch = remapCustSearch(criteria);
  const rawCustomers = await fetchCustomers(rawSearch);

  await bulkUpsertCustomers(rawCustomers);

  if (rawCustomers.length === 0) {
    console.log("[customer sync] No records fetched — lastSyncedAt unchanged");
    return {
      entityType: SYNC_ENTITY_TYPES.customer,
      lastSyncedAt: lastSyncedAt ?? syncStart.toISOString(),
      lastSyncCount: 0,
      lastSyncEdgeIterations: 0,
      lastSyncBufferSeconds: 0,
    };
  }

  const lo = lastSyncedAt ? new Date(lastSyncedAt) : new Date(HISTORY_FLOOR_ISO);
  const edgeResult = await findSyncEdge(SYNC_ENTITY_TYPES.customer, lo, syncStart);

  return {
    entityType: SYNC_ENTITY_TYPES.customer,
    lastSyncedAt: edgeResult.newLastSyncedAt,
    lastSyncCount: rawCustomers.length,
    lastSyncEdgeIterations: edgeResult.iterations,
    lastSyncBufferSeconds: Math.round(COMFORT_BUFFER_MS / 1000),
  };
}

async function syncPrograms(): Promise<SyncResult> {
  const lastSyncedAt = await getLastSyncedAt(SYNC_ENTITY_TYPES.program);
  const syncStart = new Date();

  const criteria = lastSyncedAt
    ? { updated: { min: lastSyncedAt, max: syncStart.toISOString() }, season: { min: SEASON_FLOOR, max: SEASON_CEIL } }
    : { season: { min: SEASON_FLOOR, max: SEASON_CEIL } };
  const rawSearch = remapProgSearch(criteria as Parameters<typeof remapProgSearch>[0]);
  const rawPrograms = await fetchPrograms(rawSearch);

  await bulkUpsertPrograms(rawPrograms);

  if (rawPrograms.length === 0) {
    console.log("[program sync] No records fetched — lastSyncedAt unchanged");
    return {
      entityType: SYNC_ENTITY_TYPES.program,
      lastSyncedAt: lastSyncedAt ?? syncStart.toISOString(),
      lastSyncCount: 0,
      lastSyncEdgeIterations: 0,
      lastSyncBufferSeconds: 0,
    };
  }

  const lo = lastSyncedAt ? new Date(lastSyncedAt) : new Date(HISTORY_FLOOR_ISO);
  const edgeResult = await findSyncEdge(SYNC_ENTITY_TYPES.program, lo, syncStart);

  return {
    entityType: SYNC_ENTITY_TYPES.program,
    lastSyncedAt: edgeResult.newLastSyncedAt,
    lastSyncCount: rawPrograms.length,
    lastSyncEdgeIterations: edgeResult.iterations,
    lastSyncBufferSeconds: Math.round(COMFORT_BUFFER_MS / 1000),
  };
}

async function syncServices(): Promise<SyncResult> {
  const lastSyncedAt = await getLastSyncedAt(SYNC_ENTITY_TYPES.service);
  const syncStart = new Date();

  const criteria = lastSyncedAt
    ? { updated: { min: lastSyncedAt, max: syncStart.toISOString() }, season: { min: SEASON_FLOOR, max: SEASON_CEIL } }
    : { season: { min: SEASON_FLOOR, max: SEASON_CEIL } };
  const rawSearch = remapServSearch(criteria);
  const rawServices = await fetchServices(rawSearch);

  await bulkUpsertServices(rawServices);

  // /Reporting/Service/Updated does not exist. The service lastSyncedAt is set
  // to the program edge in runDeltaSync (hypothesis: editing a service always
  // touches the parent program, so the program Reporting endpoint is a reliable
  // proxy for service changes). This result carries the count; the caller
  // overwrites lastSyncedAt with the program edge before writing metadata.
  return {
    entityType: SYNC_ENTITY_TYPES.service,
    lastSyncedAt: lastSyncedAt ?? syncStart.toISOString(), // placeholder — overwritten by caller
    lastSyncCount: rawServices.length,
    lastSyncEdgeIterations: 0,
    lastSyncBufferSeconds: 0, // overwritten by caller
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Runs a delta sync for all three entity types (customers, programs, services) concurrently.
 *
 * Each entity fetches only records updated since its last sync timestamp (delta sync).
 * If no sync has run before, performs a full load.
 *
 * After all three fetches complete, uses binary search on the RealGreen
 * Reporting/[Entity]/Updated endpoint to find the true sync edge for customers
 * and programs. Services use the program edge as a proxy — RealGreen does not
 * expose a /Reporting/Service/Updated endpoint, and editing a service in the CRM
 * also updates the parent program record, making the program edge a reliable proxy.
 *
 * All metadata writes are batched at the end — no DB writes happen inside the
 * individual sync functions.
 *
 * `lastSyncedAt` is only advanced when records are fetched. Zero-record syncs
 * leave the metadata unchanged so the same window is re-queried next time.
 *
 * See MirrorSyncRefactor.md for full documentation of the algorithm.
 *
 * Called at the start of every getMirrorCustomers request to ensure the mirror
 * collections are up to date before executing the query plan.
 */
export async function runDeltaSync(): Promise<void> {
  await connectToMongoDB();
  console.log("[mirror] Running delta sync before query...");
  const start = Date.now();

  // Step 1: Run all three fetches + upserts + edge-finding concurrently.
  const [customerResult, programResult, serviceResult] = await Promise.all([
    syncCustomers(),
    syncPrograms(),
    syncServices(),
  ]);

  // Step 2: Override service metadata with the program edge.
  // The program Reporting endpoint is used as a proxy for service changes.
  const serviceMetadata: SyncResult = {
    ...serviceResult,
    lastSyncedAt: programResult.lastSyncedAt,
    lastSyncEdgeIterations: programResult.lastSyncEdgeIterations,
    lastSyncBufferSeconds: programResult.lastSyncBufferSeconds,
  };

  // Step 3: Write all metadata at once — only for entities that fetched records.
  await Promise.all([
    customerResult.lastSyncCount > 0
      ? setLastSyncedAt(SYNC_ENTITY_TYPES.customer, customerResult)
      : Promise.resolve(),
    programResult.lastSyncCount > 0
      ? setLastSyncedAt(SYNC_ENTITY_TYPES.program, programResult)
      : Promise.resolve(),
    serviceResult.lastSyncCount > 0
      ? setLastSyncedAt(SYNC_ENTITY_TYPES.service, serviceMetadata)
      : Promise.resolve(),
  ]);

  console.log(`[mirror] Delta sync complete in ${Date.now() - start}ms`);
}
