import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";
import { SyncUtilsContract } from "@/app/syncUtils/api/SyncUtilsContract";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import { SyncMetadataModel } from "@/app/realGreen/syncMetadata/SyncMetadataModel";
import { CustomerModel } from "@/app/realGreen/customer/models/CustomerModel";
import { ProgramModel } from "@/app/realGreen/customer/models/ProgramModel";
import { ServiceModel } from "@/app/realGreen/customer/models/ServiceModel";
import { CallLogModel } from "@/app/realGreen/callLog/models/CallLogModel";
import { SYNC_ENTITY_TYPES, SyncEntityType } from "@/app/realGreen/syncMetadata/syncEntityTypes";
import { ENTITY_LABELS, GROUP_ENTITY_TYPES, SyncGroup } from "@/app/realGreen/syncLock/syncGroups";
import { SyncEntityStatus, SyncGroupStatus } from "@/app/realGreen/syncLock/SyncLockTypes";
import { forceClearLock, getSyncLock } from "@/app/realGreen/syncLock/syncLockFunc";
import { toLockStatus } from "@/app/realGreen/syncLock/syncLockLogic";
import { runDeltaSync } from "@/app/realGreen/customer/sync/runDeltaSync";
import { runFullSyncChunk, startFullSync } from "@/app/realGreen/customer/sync/runFullSync";
import { assertCurrentUserPassword } from "@/app/syncUtils/_lib/verifyCurrentUserPassword";

/**
 * Seconds. Pro plan with fluid compute allows up to 800. Each full-sync chunk is its own
 * request, so this bounds one season's load, not the whole sync.
 */
export const maxDuration = 800;

const countCollection = (entityType: SyncEntityType): Promise<number> => {
  switch (entityType) {
    case SYNC_ENTITY_TYPES.customer:
      return CustomerModel.estimatedDocumentCount();
    case SYNC_ENTITY_TYPES.program:
      return ProgramModel.estimatedDocumentCount();
    case SYNC_ENTITY_TYPES.service:
      return ServiceModel.estimatedDocumentCount();
    case SYNC_ENTITY_TYPES.callLog:
      return CallLogModel.estimatedDocumentCount();
  }
};

async function buildGroupStatus(group: SyncGroup): Promise<SyncGroupStatus> {
  await connectToMongoDB();
  const entityTypes = GROUP_ENTITY_TYPES[group];

  const [lock, metadataDocs, counts] = await Promise.all([
    getSyncLock(group),
    SyncMetadataModel.find({ entityType: { $in: [...entityTypes] } }).lean(),
    Promise.all(entityTypes.map(countCollection)),
  ]);

  const entities: SyncEntityStatus[] = entityTypes.map((entityType, index) => {
    const metadata = metadataDocs.find((doc) => doc.entityType === entityType);
    return {
      entityType,
      label: ENTITY_LABELS[entityType],
      documentCount: counts[index],
      lastSyncedAt: metadata?.lastSyncedAt ?? null,
      lastSyncCount: metadata?.lastSyncCount ?? 0,
    };
  });

  return {
    group,
    lock: toLockStatus({ lock, nowMs: Date.now() }),
    fullRun: lock?.fullRun ?? null,
    entities,
  };
}

const handlers: HandlerMap<SyncUtilsContract> = {
  getSyncStatus: {
    roles: ["admin"],
    handler: async ({ group }) => ({ success: true, payload: await buildGroupStatus(group) }),
  },

  runDeltaSync: {
    roles: ["admin"],
    handler: async ({ group }) => {
      try {
        const result = await runDeltaSync({ groups: [group] });
        if (result.skipped) {
          return { success: true, payload: { skipped: true, reason: result.reason, syncedCounts: [] } };
        }
        return {
          success: true,
          payload: { skipped: false, durationMs: result.durationMs, syncedCounts: result.syncedCounts },
        };
      } catch (e) {
        if (e instanceof AppError) throw e;
        // Admin-only route: the real cause is more useful than a generic message.
        const detail = e instanceof Error ? e.message : String(e);
        throw new AppError({ message: `Delta sync failed: ${detail}`, type: "EXTERNAL_ERROR", statusCode: 502 });
      }
    },
  },

  startFullSync: {
    roles: ["admin"],
    handler: async ({ group, password }) => {
      await assertCurrentUserPassword(password);
      return { success: true, payload: await startFullSync(group) };
    },
  },

  runFullSyncChunk: {
    roles: ["admin"],
    handler: async ({ group, chunkKey }) => ({
      success: true,
      payload: await runFullSyncChunk({ group, chunkKey }),
    }),
  },

  clearSyncLock: {
    roles: ["admin"],
    handler: async ({ group, abandonRun }) => {
      await forceClearLock({ group, abandonRun });
      return { success: true, payload: null };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
