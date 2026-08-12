import mongoose from "mongoose";
import { Punch } from "@/app/timeCard/TimeCardTypes";
import { createModel } from "@/lib/mongoose/createModel";

const PunchSegmentSchema = new mongoose.Schema(
  {
    inTime: { type: String, required: true, default: "" },
    outTime: { type: String, required: true, default: "" },
  },
  { _id: false },
);

// Schema generic omitted — Mongoose cannot reconcile the PunchSegmentSchema
// sub-document type with PunchSegment[] in the Punch type parameter.
// Type safety is provided by createModel<Punch> below.
const PunchSchema = new mongoose.Schema(
  {
    punchId: { type: Number, required: true },
    employeeId: { type: String, required: true },
    punchDate: { type: String, required: true },
    segments: { type: [PunchSegmentSchema], required: true },
  },
  { timestamps: true },
);

PunchSchema.index({ punchId: 1 }, { unique: true });
PunchSchema.index({ employeeId: 1 });
PunchSchema.index({ punchDate: 1 });

export const PunchModel = createModel<Punch>("Punch", PunchSchema);
