import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { CorruptedSyncRecord } from "@/app/realGreen/customer/sync/corruptedRecords/CorruptedSyncRecordTypes";

const CorruptedSyncRecordSchema = new mongoose.Schema<CorruptedSyncRecord>(
  {
    corruptedContextId: { type: String, required: true },
    entityType: { type: String, required: true },
    entityBeforeId: { type: Number, default: null },
    entityAfterId: { type: Number, default: null },
    timestamp: { type: String, required: true },
  },
  { timestamps: true },
);

// Append-only collection — no unique index. Each sync encounter is a distinct document.
// Indexes support the primary query patterns for the investigation UI.
CorruptedSyncRecordSchema.index({ entityType: 1 });
CorruptedSyncRecordSchema.index({ timestamp: 1 });
CorruptedSyncRecordSchema.index({ entityBeforeId: 1 });
CorruptedSyncRecordSchema.index({ entityAfterId: 1 });

export const CorruptedSyncRecordModel = createModel(
  "CorruptedSyncRecord",
  CorruptedSyncRecordSchema,
);
