import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { SyncMetadataModel } from "@/app/realGreen/syncMetadata/SyncMetadataModel";
import { SyncEntityType } from "@/app/realGreen/syncMetadata/syncEntityTypes";

/**
 * Returns the `lastSyncedAt` ISO 8601 timestamp for the given entity type,
 * or `null` if no sync has ever run for that entity (triggers a full initial load).
 */
export async function getLastSyncedAt(entityType: SyncEntityType): Promise<string | null> {
  await connectToMongoDB();
  const doc = await SyncMetadataModel.findOne({ entityType }).lean();
  return doc?.lastSyncedAt ?? null;
}

type SetLastSyncedAtParams = {
  lastSyncedAt: string;
  lastSyncCount: number;
  lastSyncEdgeIterations: number;
  lastSyncBufferSeconds: number;
};

/**
 * Records the current timestamp as `lastQueriedAt` on the customer SyncMetadata document.
 * Called fire-and-forget (no await) by the mirror query route to track user activity.
 * The Vercel Cron job reads this value to determine how frequently to run delta syncs.
 */
export async function recordMirrorQuery(): Promise<void> {
  await connectToMongoDB();
  await SyncMetadataModel.findOneAndUpdate(
    { entityType: "customer" },
    { $set: { lastQueriedAt: new Date().toISOString() } },
  );
}

/**
 * Persists the `lastSyncedAt` timestamp and diagnostic fields for the given entity type.
 * Creates the document on first sync; updates it on subsequent syncs.
 *
 * Only call this when records were actually fetched — do not advance lastSyncedAt
 * when a sync returns 0 records (the window should stay the same).
 */
export async function setLastSyncedAt(
  entityType: SyncEntityType,
  { lastSyncedAt, lastSyncCount, lastSyncEdgeIterations, lastSyncBufferSeconds }: SetLastSyncedAtParams,
): Promise<void> {
  await connectToMongoDB();
  await SyncMetadataModel.findOneAndUpdate(
    { entityType },
    { $set: { entityType, lastSyncedAt, lastSyncCount, lastSyncEdgeIterations, lastSyncBufferSeconds } },
    { upsert: true },
  );
}
