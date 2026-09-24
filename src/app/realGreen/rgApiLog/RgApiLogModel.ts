import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { RgApiLog } from "@/app/realGreen/rgApiLog/RgApiLogTypes";

const RgApiLogSchema = new mongoose.Schema<RgApiLog>({
  timestamp: { type: String, required: true },
  operation: { type: String, required: true },
  callsByEndpoint: { type: mongoose.Schema.Types.Mixed, required: true },
  totalCalls: { type: Number, required: true },
  recordCount: { type: Number },
  durationMs: { type: Number },
});

// Auto-delete after 365 days. The timestamp field is a string (ISO 8601), so we
// use a separate createdAt date field for the TTL index.
RgApiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const RgApiLogModel = createModel("RgApiLog", RgApiLogSchema);
