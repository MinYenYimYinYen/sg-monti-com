import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import { remapServSearch } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapServSearch";
import { streamServices } from "@/app/realGreen/customer/sync/serviceSyncFunc";
import { SYNC_GROUPS } from "@/app/realGreen/syncLock/syncGroups";
import { FullSyncChunk } from "@/app/realGreen/syncLock/SyncLockTypes";
import { acquireLockOrThrow, releaseLock } from "@/app/realGreen/syncLock/syncLockFunc";
import { buildServiceResyncChunks } from "@/app/realGreen/syncLock/syncLockLogic";

const LOG_PREFIX = "[service resync]";

/**
 * Re-fetches one season slice of services from RealGreen and upserts it over the mirror.
 *
 * Unlike a full sync nothing is wiped, no run is persisted and no sync checkpoint is written, so
 * the mirror stays queryable and delta sync keeps its place. It takes the customer group lock so
 * it cannot overlap a delta sync, a full sync or another re-sync. Every write is an idempotent
 * upsert, so a failed or timed-out chunk is simply run again.
 *
 * It cannot remove services deleted in RealGreen; only a full sync does that.
 */
export async function runServiceResyncChunk({ chunkKey }: { chunkKey: string }): Promise<FullSyncChunk> {
  const chunk = buildServiceResyncChunks().find((candidate) => candidate.key === chunkKey);
  if (!chunk || chunk.seasonMin === undefined || chunk.seasonMax === undefined) {
    throw new AppError({ message: `Unknown service re-sync step '${chunkKey}'.`, type: "API_ERROR", statusCode: 400 });
  }

  await connectToMongoDB();
  const group = SYNC_GROUPS.customerGroup;
  const holderRunId = await acquireLockOrThrow({ group, operation: "resync" });

  const start = Date.now();
  try {
    console.log(`${LOG_PREFIX} starting "${chunk.label}"`);
    const rawSearch = remapServSearch({ season: { min: chunk.seasonMin, max: chunk.seasonMax } });
    const { writtenCount: syncedCount } = await streamServices({ rawSearch });
    const durationMs = Date.now() - start;
    console.log(`${LOG_PREFIX} finished "${chunk.label}" - ${syncedCount} records in ${durationMs}ms`);
    return { ...chunk, status: "done", syncedCount, durationMs };
  } catch (e) {
    console.error(`${LOG_PREFIX} "${chunk.label}" failed after ${Date.now() - start}ms`, e);
    if (e instanceof AppError) throw e;
    const detail = e instanceof Error ? e.message : String(e);
    throw new AppError({ message: `${chunk.label} failed: ${detail}`, type: "EXTERNAL_ERROR", statusCode: 502 });
  } finally {
    await releaseLock({ group, holderRunId });
  }
}
