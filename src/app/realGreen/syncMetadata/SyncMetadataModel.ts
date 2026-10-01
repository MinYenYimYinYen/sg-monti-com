import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { SyncMetadata } from "@/app/realGreen/syncMetadata/SyncMetadataTypes";

const SyncMetadataSchema = new mongoose.Schema<SyncMetadata>(
  {
    entityType: { type: String, required: true, unique: true },
    lastSyncedAt: { type: String, required: true },
    lastSyncCount: { type: Number, required: true, default: 0 },
    lastSyncEdgeIterations: { type: Number, required: true, default: 0 },
    lastSyncBufferSeconds: { type: Number, required: true, default: 0 },
    lastQueriedAt: { type: String, required: false },
  },
  { timestamps: true },
);

export const SyncMetadataModel = createModel("SyncMetadata", SyncMetadataSchema);
