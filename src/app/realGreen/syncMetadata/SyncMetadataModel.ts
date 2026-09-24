import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { SyncMetadata } from "@/app/realGreen/syncMetadata/SyncMetadataTypes";

const SyncMetadataSchema = new mongoose.Schema<SyncMetadata>(
  {
    entityType: { type: String, required: true, unique: true },
    lastSyncedAt: { type: String, required: true },
  },
  { timestamps: true },
);

export const SyncMetadataModel = createModel("SyncMetadata", SyncMetadataSchema);
