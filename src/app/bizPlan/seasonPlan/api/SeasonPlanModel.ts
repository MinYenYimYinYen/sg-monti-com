import mongoose, { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { SeasonPlan } from "@/app/bizPlan/seasonPlan/SeasonPlanTypes";

const ServCodeScheduleSchema = new Schema(
  {
    servCodeId: { type: String, required: true },
    plannedStart: { type: String, required: true },
    plannedEnd: { type: String, required: true },
  },
  { _id: false },
);

const SeasonPlanSchema = new Schema<SeasonPlan>(
  {
    name: { type: String, required: true, unique: true },
    year: { type: Number, required: true },
    cascadeThreshold: { type: Number, required: true, default: 0.95 },
    snowDeadline: { type: String, default: null },
    servCodeSchedules: { type: [ServCodeScheduleSchema], required: true, default: [] },
    isActive: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

export const SeasonPlanModel = createModel<SeasonPlan>("SeasonPlan", SeasonPlanSchema);
