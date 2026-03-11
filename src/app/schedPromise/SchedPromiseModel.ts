import mongoose from "mongoose";
import {
  SchedPromiseDraft,
  SchedPromise,
} from "@/app/schedPromise/SchedPromiseTypes";
import { createModel } from "@/lib/mongoose/createModel";

const SchedPromiseSchema = new mongoose.Schema<SchedPromise>({
  entityType: { type: String, required: true, enum: ["service", "program", "customer"] },
  entityId: { type: Number, required: true },
  isPermanent: { type: String, required: true, enum: ["true", "false", ""] },
  tech: { type: String },
  equip: { type: String },
  condition: { type: String },
  granLiq: { type: String },
  dateTarget: { type: mongoose.Schema.Types.Mixed },
  timeOfDay: { type: mongoose.Schema.Types.Mixed },
  daysOfWeek: [{ type: String }],
  other: { type: String },
});

// Add compound index for efficient queries
SchedPromiseSchema.index({ entityType: 1, entityId: 1 });

const SchedPromiseModel = createModel("SchedPromise", SchedPromiseSchema);

export default SchedPromiseModel;
