import mongoose from "mongoose";
import { PlannedTimeOff } from "@/app/plannedTimeOff/plannedTimeOffTypes";
import { createModel } from "@/lib/mongoose/createModel";

const TRangeSchema = new mongoose.Schema(
  {
    min: { type: String, required: true },
    max: { type: String, required: true },
  },
  { _id: false },
);

const PlannedTimeOffSchema = new mongoose.Schema<PlannedTimeOff>(
  {
    plannedTimeOffId: { type: String, required: true },
    employeeId: { type: String, required: true },
    dateRange: { type: TRangeSchema, required: true },
    note: { type: String, required: true, default: "" },
  },
  { timestamps: true },
);

PlannedTimeOffSchema.index({ plannedTimeOffId: 1 }, { unique: true });
PlannedTimeOffSchema.index({ employeeId: 1 });

export const PlannedTimeOffModel = createModel("PlannedTimeOff", PlannedTimeOffSchema);
