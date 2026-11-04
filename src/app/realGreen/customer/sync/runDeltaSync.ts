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
import { remapCallLogSearch } from "@/app/realGreen/callLog/_lib/remapCallLogSearch";
import { fetchCallLogs, bulkUpsertCallLogs, findCallLogSyncEdge } from "@/app/realGreen/callLog/sync/callLogSyncFunc";
import { getSyncSeasonWindow } from "@/app/realGreen/syncMetadata/syncWindow";
import { SYNC_GROUPS, SyncGroup } from "@/app/realGreen/syncLock/syncGroups";
import { releaseLock, tryAcquireLock } from "@/app/realGreen/syncLock/syncLockFunc";
import { SyncedCount } from "@/app/realGreen/syncLock/SyncLockTypes";

const ALL_CUST_STATS: CustStat[] = ["M", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const {
  floorYear: SEASON_FLOOR,
  ceilYear: SEASON_CEIL,
  historyFloorIso: HISTORY_FLOOR_ISO,
} = getSyncSeasonWindow();

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

const ALL_DELTA_GROUPS: readonly SyncGroup[] = [SYNC_GROUPS.customerGroup, SYNC_GROUPS.callLog];

/**
 * `skipped` means another sync (or an unfinished full sync) holds a group's lock.
 * Callers decide what that means: the cron treats it as a no-op, the mirror route as an error.
 */
export type DeltaSyncResult =
  | { skipped: true; reason: string }
  | { skipped: false; durationMs: number; syncedCounts: SyncedCount[] };

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

async function syncCallLogs(): Promise<SyncResult> {
  const lastSyncedAt = await getLastSyncedAt(SYNC_ENTITY_TYPES.callLog);
  const syncStart = new Date();

  const criteria = lastSyncedAt
    ? { updated: { min: lastSyncedAt, max: syncStart.toISOString() } }
    : {};
  const rawSearch = remapCallLogSearch(criteria);
  const rawLogs = await fetchCallLogs(rawSearch);

  await bulkUpsertCallLogs(rawLogs);

  if (rawLogs.length === 0) {
    console.log("[callLog sync] No records fetched — lastSyncedAt unchanged");
    return {
      entityType: SYNC_ENTITY_TYPES.callLog,
      lastSyncedAt: lastSyncedAt ?? syncStart.toISOString(),
      lastSyncCount: 0,
      lastSyncEdgeIterations: 0,
      lastSyncBufferSeconds: 0,
    };
  }

  // Call logs include notes[].date in the response — compute the edge directly
  // from the returned data rather than calling a Reporting endpoint.
  const edgeResult = findCallLogSyncEdge(rawLogs, syncStart);
  const newLastSyncedAt = edgeResult?.newLastSyncedAt ?? syncStart.toISOString();
  const bufferSeconds = edgeResult?.bufferSeconds ?? 0;

  console.log(`[callLog sync] Edge found — new lastSyncedAt: ${newLastSyncedAt}`);

  return {
    entityType: SYNC_ENTITY_TYPES.callLog,
    lastSyncedAt: newLastSyncedAt,
    lastSyncCount: rawLogs.length,
    lastSyncEdgeIterations: 0, // no binary search needed — edge computed from response data
    lastSyncBufferSeconds: bufferSeconds,
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
 * See src/app/vercelCron/mirrorSync/mirrorSync.readme.md and findSyncEdge.ts for the algorithm.
 *
 * Takes a lock per sync group and skips (returns `skipped: true`) when one is held, including
 * while a full sync is unfinished. Called by the mirrorSync cron, by the Sync Utilities page,
 * and by getMirrorCustomers only when `syncFirst` is set.
 */
export async function runDeltaSync(
  { groups = ALL_DELTA_GROUPS }: { groups?: readonly SyncGroup[] } = {},
): Promise<DeltaSyncResult> {
  await connectToMongoDB();

  // Take every requested group's lease up front so a partially-locked run never starts.
  const held: { group: SyncGroup; holderRunId: string }[] = [];
  for (const group of groups) {
    const lock = await tryAcquireLock({ group, operation: "delta" });
    if (!lock.acquired) {
      await Promise.all(held.map((lease) => releaseLock(lease)));
      console.log(`[mirror] Delta sync skipped (${group}): ${lock.reason}`);
      return { skipped: true, reason: lock.reason };
    }
    held.push({ group, holderRunId: lock.holderRunId });
  }

  console.log(`[mirror] Running delta sync (${groups.join(", ")})...`);
  const start = Date.now();

  try {
    const syncCustomerGroup = async (): Promise<SyncedCount[]> => {
      // Step 1: Run the three entity fetches + upserts + edge-finding concurrently.
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

      // Step 3: Write metadata — only for entities that fetched records.
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

      return [
        { entityType: SYNC_ENTITY_TYPES.customer, synced: customerResult.lastSyncCount },
        { entityType: SYNC_ENTITY_TYPES.program, synced: programResult.lastSyncCount },
        { entityType: SYNC_ENTITY_TYPES.service, synced: serviceResult.lastSyncCount },
      ];
    };

    const syncCallLogGroup = async (): Promise<SyncedCount[]> => {
      const callLogResult = await syncCallLogs();
      if (callLogResult.lastSyncCount > 0) {
        await setLastSyncedAt(SYNC_ENTITY_TYPES.callLog, callLogResult);
      }
      return [{ entityType: SYNC_ENTITY_TYPES.callLog, synced: callLogResult.lastSyncCount }];
    };

    // Groups run concurrently, as the four entity syncs always have.
    const groupResults = await Promise.all([
      groups.includes(SYNC_GROUPS.customerGroup) ? syncCustomerGroup() : Promise.resolve([]),
      groups.includes(SYNC_GROUPS.callLog) ? syncCallLogGroup() : Promise.resolve([]),
    ]);
    const syncedCounts = groupResults.flat();

    const durationMs = Date.now() - start;
    console.log(`[mirror] Delta sync complete in ${durationMs}ms`);
    return { skipped: false, durationMs, syncedCounts };
  } finally {
    await Promise.all(held.map((lease) => releaseLock(lease)));
  }
}
