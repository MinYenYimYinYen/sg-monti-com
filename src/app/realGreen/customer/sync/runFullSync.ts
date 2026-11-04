import { randomUUID } from "crypto";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import { CustStat } from "@/app/realGreen/_lib/subTypes/RGSearchRanges";
import { SYNC_ENTITY_TYPES } from "@/app/realGreen/syncMetadata/syncEntityTypes";
import { clearLastSyncedAt, setLastSyncedAt } from "@/app/realGreen/syncMetadata/syncMetadataFunc";
import { getSyncSeasonWindow } from "@/app/realGreen/syncMetadata/syncWindow";
import { CustomerModel } from "@/app/realGreen/customer/models/CustomerModel";
import { ProgramModel } from "@/app/realGreen/customer/models/ProgramModel";
import { ServiceModel } from "@/app/realGreen/customer/models/ServiceModel";
import { CallLogModel } from "@/app/realGreen/callLog/models/CallLogModel";
import { remapCustSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapCustSearch";
import { remapProgSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapProgSearch";
import { remapServSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapServSearch";
import { remapCallLogSearch } from "@/app/realGreen/callLog/_lib/remapCallLogSearch";
import { fetchCustomers, bulkUpsertCustomers } from "@/app/realGreen/customer/sync/customerSyncFunc";
import { fetchPrograms, bulkUpsertPrograms } from "@/app/realGreen/customer/sync/programSyncFunc";
import { fetchServices, bulkUpsertServices } from "@/app/realGreen/customer/sync/serviceSyncFunc";
import { fetchCallLogs, bulkUpsertCallLogs, findCallLogSyncEdge } from "@/app/realGreen/callLog/sync/callLogSyncFunc";
import { findSyncEdge, COMFORT_BUFFER_MS } from "@/app/realGreen/customer/sync/findSyncEdge";
import { GROUP_ENTITY_TYPES, GROUP_LABELS, SyncGroup } from "@/app/realGreen/syncLock/syncGroups";
import { FullSyncChunk, FullSyncRun } from "@/app/realGreen/syncLock/SyncLockTypes";
import {
  acquireLockOrThrow,
  forceClearLock,
  getSyncLock,
  releaseLock,
  saveFullRun,
} from "@/app/realGreen/syncLock/syncLockFunc";
import {
  buildFullSyncChunks,
  findChunkBlocker,
  isLastChunk,
  isLeaseActive,
  sumSyncedCount,
  updateChunk,
} from "@/app/realGreen/syncLock/syncLockLogic";

const LOG_PREFIX = "[full sync]";
const ALL_CUST_STATS: CustStat[] = ["M", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// ---------------------------------------------------------------------------
// Wipe
// ---------------------------------------------------------------------------

/**
 * Clears the sync checkpoints BEFORE deleting documents. If anything fails or the request
 * dies in between, `lastSyncedAt` is already null, so no delta sync can mistake a
 * half-empty mirror for an up-to-date one.
 */
async function wipeGroup(group: SyncGroup): Promise<void> {
  await connectToMongoDB();
  await clearLastSyncedAt(GROUP_ENTITY_TYPES[group]);

  if (group === "customerGroup") {
    // Services first, customers last: a mirror query racing the wipe sees "no customers", not orphans.
    await ServiceModel.deleteMany({});
    await ProgramModel.deleteMany({});
    await CustomerModel.deleteMany({});
  } else {
    await CallLogModel.deleteMany({});
  }
  console.log(`${LOG_PREFIX} Wiped ${GROUP_LABELS[group]}`);
}

// ---------------------------------------------------------------------------
// Chunk execution
// ---------------------------------------------------------------------------

type ChunkOutcome = { syncedCount: number };

async function executeChunk({
  group,
  chunk,
  run,
}: {
  group: SyncGroup;
  chunk: FullSyncChunk;
  run: FullSyncRun;
}): Promise<ChunkOutcome> {
  const { seasonMin, seasonMax } = chunk;

  switch (chunk.kind) {
    case "wipe": {
      await wipeGroup(group);
      return { syncedCount: 0 };
    }

    case "customer": {
      const rawSearch = remapCustSearch({ statuses: ALL_CUST_STATS });
      const rawCustomers = await fetchCustomers(rawSearch);
      return { syncedCount: await bulkUpsertCustomers(rawCustomers) };
    }

    case "program": {
      if (seasonMin === undefined || seasonMax === undefined) throw new Error(`Step ${chunk.key} has no season range`);
      const rawSearch = remapProgSearch({ season: { min: seasonMin, max: seasonMax } });
      const rawPrograms = await fetchPrograms(rawSearch);
      return { syncedCount: await bulkUpsertPrograms(rawPrograms) };
    }

    case "service": {
      if (seasonMin === undefined || seasonMax === undefined) throw new Error(`Step ${chunk.key} has no season range`);
      const rawSearch = remapServSearch({ season: { min: seasonMin, max: seasonMax } });
      const rawServices = await fetchServices(rawSearch);
      return { syncedCount: await bulkUpsertServices(rawServices) };
    }

    case "callLog": {
      const rawLogs = await fetchCallLogs(remapCallLogSearch({}));
      const synced = await bulkUpsertCallLogs(rawLogs);
      // Call logs carry their own edge in the response, so their checkpoint is written here
      // rather than in a finalize step.
      const edge = findCallLogSyncEdge(rawLogs, new Date(run.startedAt));
      if (edge && synced > 0) {
        await setLastSyncedAt(SYNC_ENTITY_TYPES.callLog, {
          lastSyncedAt: edge.newLastSyncedAt,
          lastSyncCount: synced,
          lastSyncEdgeIterations: 0,
          lastSyncBufferSeconds: edge.bufferSeconds,
        });
      }
      return { syncedCount: synced };
    }

    case "finalize": {
      await finalizeCustomerGroup(run);
      return { syncedCount: 0 };
    }

    default:
      throw new Error(`Unknown step kind: ${chunk.kind satisfies never}`);
  }
}

/**
 * Writes the checkpoints once every data chunk has loaded. Edges are searched up to the
 * run's start (not now), so anything changed while the full sync ran is re-fetched by the
 * next delta. Service uses the program edge, exactly as in the delta sync.
 */
async function finalizeCustomerGroup(run: FullSyncRun): Promise<void> {
  const { historyFloorIso } = getSyncSeasonWindow();
  const floor = new Date(historyFloorIso);
  const runStart = new Date(run.startedAt);
  const bufferSeconds = Math.round(COMFORT_BUFFER_MS / 1000);

  const customerCount = sumSyncedCount({ run, kind: "customer" });
  const programCount = sumSyncedCount({ run, kind: "program" });
  const serviceCount = sumSyncedCount({ run, kind: "service" });

  if (customerCount > 0) {
    const edge = await findSyncEdge(SYNC_ENTITY_TYPES.customer, floor, runStart);
    await setLastSyncedAt(SYNC_ENTITY_TYPES.customer, {
      lastSyncedAt: edge.newLastSyncedAt,
      lastSyncCount: customerCount,
      lastSyncEdgeIterations: edge.iterations,
      lastSyncBufferSeconds: bufferSeconds,
    });
  }

  if (programCount > 0) {
    const edge = await findSyncEdge(SYNC_ENTITY_TYPES.program, floor, runStart);
    const checkpoint = {
      lastSyncedAt: edge.newLastSyncedAt,
      lastSyncEdgeIterations: edge.iterations,
      lastSyncBufferSeconds: bufferSeconds,
    };
    await setLastSyncedAt(SYNC_ENTITY_TYPES.program, { ...checkpoint, lastSyncCount: programCount });
    if (serviceCount > 0) {
      await setLastSyncedAt(SYNC_ENTITY_TYPES.service, { ...checkpoint, lastSyncCount: serviceCount });
    }
  }
}

// ---------------------------------------------------------------------------
// Public operations
// ---------------------------------------------------------------------------

function toOperationalError({ label, cause }: { label: string; cause: unknown }): AppError {
  if (cause instanceof AppError) return cause;
  const detail = cause instanceof Error ? cause.message : String(cause);
  return new AppError({ message: `${label} failed: ${detail}`, type: "EXTERNAL_ERROR", statusCode: 502 });
}

/**
 * Begins a full sync: creates the persisted run and performs the wipe.
 *
 * The caller must already have verified the password. The wipe is part of this request
 * (not a later chunk) so the password gate sits directly in front of the only destructive step.
 *
 * A previous run is only replaced when its wipe never completed; once documents have been
 * deleted and reloaded, resuming or abandoning it is the admin's explicit choice.
 */
export async function startFullSync(group: SyncGroup): Promise<FullSyncRun> {
  await connectToMongoDB();

  const existing = await getSyncLock(group);
  if (existing?.fullRun) {
    const wipeDone = existing.fullRun.chunks.find((chunk) => chunk.kind === "wipe")?.status === "done";
    if (wipeDone) {
      throw new AppError({
        message: "A full sync is already in progress. Resume it, or abandon it before starting over.",
        type: "API_ERROR",
        statusCode: 409,
      });
    }
    if (isLeaseActive({ expiresAt: existing.expiresAt, nowMs: Date.now() })) {
      throw new AppError({
        message: "A sync is still running for this group. Try again when it finishes.",
        type: "API_ERROR",
        statusCode: 409,
      });
    }
    await forceClearLock({ group, abandonRun: true });
  }

  const holderRunId = await acquireLockOrThrow({ group, operation: "full" });

  let run: FullSyncRun = {
    runId: randomUUID(),
    startedAt: new Date().toISOString(),
    chunks: buildFullSyncChunks({ group }),
  };

  try {
    // Persist before wiping so mirror queries are blocked from the very first deletion.
    await saveFullRun({ group, holderRunId, fullRun: run });

    const wipeStart = Date.now();
    run = updateChunk({ run, chunkKey: "wipe", patch: { status: "running" } });
    await saveFullRun({ group, holderRunId, fullRun: run });

    await wipeGroup(group);

    run = updateChunk({ run, chunkKey: "wipe", patch: { status: "done", durationMs: Date.now() - wipeStart } });
    await releaseLock({ group, holderRunId, fullRun: run });
    return run;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    run = updateChunk({ run, chunkKey: "wipe", patch: { status: "failed", errorMessage: message } });
    await releaseLock({ group, holderRunId, fullRun: run });
    throw toOperationalError({ label: "Clearing the mirror", cause: e });
  }
}

/**
 * Runs one step of the current full sync. Steps must run in order; a failed or interrupted
 * step is simply run again (every write is an idempotent upsert).
 *
 * Progress is persisted before and after the work, and the run is closed after the last step.
 */
export async function runFullSyncChunk({
  group,
  chunkKey,
}: {
  group: SyncGroup;
  chunkKey: string;
}): Promise<FullSyncRun> {
  await connectToMongoDB();

  const current = await getSyncLock(group);
  if (!current?.fullRun) {
    throw new AppError({ message: "There is no full sync in progress.", type: "API_ERROR", statusCode: 409 });
  }

  const holderRunId = await acquireLockOrThrow({ group, operation: "full", fullRunId: current.fullRun.runId });

  // Re-read after acquiring so decisions use state no other request can change.
  const locked = await getSyncLock(group);
  let run = locked?.fullRun;
  if (!run) {
    await releaseLock({ group, holderRunId });
    throw new AppError({ message: "There is no full sync in progress.", type: "API_ERROR", statusCode: 409 });
  }

  const blocker = findChunkBlocker({ run, chunkKey });
  if (blocker) {
    await releaseLock({ group, holderRunId });
    throw new AppError({ message: blocker, type: "API_ERROR", statusCode: 409 });
  }

  const chunk = run.chunks.find((candidate) => candidate.key === chunkKey);
  if (!chunk) {
    await releaseLock({ group, holderRunId });
    throw new AppError({ message: `Unknown step '${chunkKey}'.`, type: "API_ERROR", statusCode: 400 });
  }
  if (chunk.kind === "wipe") {
    // The wipe is destructive and password-gated; it only ever runs inside startFullSync.
    await releaseLock({ group, holderRunId });
    throw new AppError({
      message: "Clearing the mirror requires re-entering your password. Start the full sync again.",
      type: "API_ERROR",
      statusCode: 409,
    });
  }

  const start = Date.now();
  try {
    run = updateChunk({ run, chunkKey, patch: { status: "running", errorMessage: undefined } });
    await saveFullRun({ group, holderRunId, fullRun: run });

    console.log(`${LOG_PREFIX} ${group}: starting "${chunk.label}"`);
    const { syncedCount } = await executeChunk({ group, chunk, run });
    const durationMs = Date.now() - start;
    console.log(`${LOG_PREFIX} ${group}: finished "${chunk.label}" — ${syncedCount} records in ${durationMs}ms`);

    run = updateChunk({ run, chunkKey, patch: { status: "done", syncedCount, durationMs } });
    // Closing the run (null) is what re-opens the mirror to queries and delta syncs.
    await releaseLock({ group, holderRunId, fullRun: isLastChunk({ run, chunkKey }) ? null : run });
    return run;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`${LOG_PREFIX} ${group}: "${chunk.label}" failed after ${Date.now() - start}ms`, e);
    run = updateChunk({
      run,
      chunkKey,
      patch: { status: "failed", errorMessage: message, durationMs: Date.now() - start },
    });
    await releaseLock({ group, holderRunId, fullRun: run });
    throw toOperationalError({ label: chunk.label, cause: e });
  }
}
