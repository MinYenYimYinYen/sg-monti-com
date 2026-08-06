import mongoose from "mongoose";
import { Holiday } from "@/app/holiday/holidayTypes";
import { createModel } from "@/lib/mongoose/createModel";

const TRangeSchema = new mongoose.Schema(
  {
    min: { type: String, required: true },
    max: { type: String, required: true },
  },
  { _id: false },
);

const HolidaySchema = new mongoose.Schema<Holiday>(
  {
    holidayId: { type: String, required: true },
    description: { type: String, required: true },
    dateRange: { type: TRangeSchema, required: true },
  },
  { timestamps: true },
);

HolidaySchema.index({ holidayId: 1 }, { unique: true });

export const HolidayModel = createModel("Holiday", HolidaySchema);
