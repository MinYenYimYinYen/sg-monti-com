import { randomUUID } from "crypto";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import { SyncLockModel } from "@/app/realGreen/syncLock/SyncLockModel";
import { SyncGroup, SYNC_GROUPS } from "@/app/realGreen/syncLock/syncGroups";
import { FullSyncRun, SyncLockDoc, SyncOperation } from "@/app/realGreen/syncLock/SyncLockTypes";
import { describeLockBlock, isLeaseActive, LOCK_LEASE_MS } from "@/app/realGreen/syncLock/syncLockLogic";

const MONGO_DUPLICATE_KEY = 11000;

const EMPTY_LEASE = { holderRunId: null, operation: null, lockedAt: null, expiresAt: null } as const;

export type AcquireResult = { acquired: true; holderRunId: string } | { acquired: false; reason: string };

export async function getSyncLock(group: SyncGroup): Promise<SyncLockDoc | null> {
  await connectToMongoDB();
  const doc = await SyncLockModel.findOne({ group }).lean();
  return doc as unknown as SyncLockDoc | null;
}

async function ensureLockDoc(group: SyncGroup): Promise<void> {
  try {
    await SyncLockModel.updateOne(
      { group },
      { $setOnInsert: { group, ...EMPTY_LEASE, fullRun: null } },
      { upsert: true },
    );
  } catch (e) {
    // A concurrent caller created the document first; that is exactly what we wanted.
    if ((e as { code?: number }).code !== MONGO_DUPLICATE_KEY) throw e;
  }
}

/**
 * Atomically takes the lease for `group`, or reports why it could not.
 *
 * Succeeds only when the lease is free or expired AND the full-sync state matches:
 * - without `fullRunId`, no full-sync run may exist (delta and fresh starts);
 * - with `fullRunId`, that exact run must be the current one (chunk requests).
 *
 * The lease is a time-limited claim, not a flag, so a request that dies without cleaning
 * up cannot block the group forever.
 */
export async function tryAcquireLock({
  group,
  operation,
  fullRunId,
}: {
  group: SyncGroup;
  operation: SyncOperation;
  fullRunId?: string;
}): Promise<AcquireResult> {
  await connectToMongoDB();
  await ensureLockDoc(group);

  const now = new Date();
  const nowIso = now.toISOString();
  const holderRunId = randomUUID();

  const acquired = await SyncLockModel.findOneAndUpdate(
    {
      group,
      ...(fullRunId ? { "fullRun.runId": fullRunId } : { fullRun: null }),
      $or: [{ holderRunId: null }, { expiresAt: { $lte: nowIso } }],
    },
    {
      $set: {
        holderRunId,
        operation,
        lockedAt: nowIso,
        expiresAt: new Date(now.getTime() + LOCK_LEASE_MS).toISOString(),
      },
    },
    { new: true },
  ).lean();

  if (acquired) return { acquired: true, holderRunId };

  const current = await getSyncLock(group);
  if (fullRunId && current?.fullRun?.runId !== fullRunId) {
    return { acquired: false, reason: "This full sync is no longer the current run. Refresh the page." };
  }
  return { acquired: false, reason: describeLockBlock({ lock: current, nowMs: now.getTime() }) };
}

/** Like `tryAcquireLock`, but throws an operational error whose message reaches the user. */
export async function acquireLockOrThrow(params: {
  group: SyncGroup;
  operation: SyncOperation;
  fullRunId?: string;
}): Promise<string> {
  const result = await tryAcquireLock(params);
  if (!result.acquired) {
    throw new AppError({ message: result.reason, type: "API_ERROR", statusCode: 409 });
  }
  return result.holderRunId;
}

/**
 * Releases the lease only if `holderRunId` still owns it, so a slow run whose lease
 * expired cannot free a lock another run has since taken.
 * Pass `fullRun` to persist new run state in the same write (`null` closes the run).
 */
export async function releaseLock({
  group,
  holderRunId,
  fullRun,
}: {
  group: SyncGroup;
  holderRunId: string;
  fullRun?: FullSyncRun | null;
}): Promise<void> {
  await connectToMongoDB();
  await SyncLockModel.updateOne(
    { group, holderRunId },
    { $set: { ...EMPTY_LEASE, ...(fullRun !== undefined ? { fullRun } : {}) } },
  );
}

/** Persists run progress while the caller still holds the lease. */
export async function saveFullRun({
  group,
  holderRunId,
  fullRun,
}: {
  group: SyncGroup;
  holderRunId: string;
  fullRun: FullSyncRun;
}): Promise<void> {
  await connectToMongoDB();
  await SyncLockModel.updateOne({ group, holderRunId }, { $set: { fullRun } });
}

/**
 * Admin escape hatch. Always frees the lease. With `abandonRun` it also discards an
 * incomplete full sync, after which a delta sync does a normal initial load.
 */
export async function forceClearLock({
  group,
  abandonRun,
}: {
  group: SyncGroup;
  abandonRun: boolean;
}): Promise<void> {
  await connectToMongoDB();
  await SyncLockModel.updateOne(
    { group },
    { $set: { ...EMPTY_LEASE, ...(abandonRun ? { fullRun: null } : {}) } },
    { upsert: true },
  );
}

/**
 * Guard for mirror queries. During a full sync the customer, program and service
 * collections are empty or partial, and an empty result would look like missing customers,
 * so queries fail loudly instead.
 */
export async function assertMirrorAvailable(): Promise<void> {
  const lock = await getSyncLock(SYNC_GROUPS.customerGroup);
  if (!lock) return;
  const fullSyncLockActive =
    lock.operation === "full" && isLeaseActive({ expiresAt: lock.expiresAt, nowMs: Date.now() });
  if (lock.fullRun || fullSyncLockActive) {
    throw new AppError({
      message: "The customer mirror is being rebuilt by a full sync. Try again when it finishes.",
      type: "API_ERROR",
      statusCode: 409,
    });
  }
}
