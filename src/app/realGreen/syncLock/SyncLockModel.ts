import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { FullSyncChunk, FullSyncRun, SyncLockDoc } from "@/app/realGreen/syncLock/SyncLockTypes";

const FullSyncChunkSchema = new mongoose.Schema<FullSyncChunk>(
  {
    key: { type: String, required: true },
    kind: { type: String, required: true },
    label: { type: String, required: true },
    seasonMin: { type: Number },
    seasonMax: { type: Number },
    status: { type: String, required: true, enum: ["pending", "running", "done", "failed"] },
    syncedCount: { type: Number },
    durationMs: { type: Number },
    errorMessage: { type: String },
  },
  { _id: false },
);

const FullSyncRunSchema = new mongoose.Schema<FullSyncRun>(
  {
    runId: { type: String, required: true },
    startedAt: { type: String, required: true },
    chunks: { type: [FullSyncChunkSchema], default: [] },
  },
  { _id: false },
);

const SyncLockSchema = new mongoose.Schema<SyncLockDoc>(
  {
    group: { type: String, required: true, unique: true },
    holderRunId: { type: String, default: null },
    operation: { type: String, default: null },
    lockedAt: { type: String, default: null },
    expiresAt: { type: String, default: null },
    fullRun: { type: FullSyncRunSchema, default: null },
  },
  { timestamps: true },
);

export const SyncLockModel = createModel("SyncLock", SyncLockSchema);
