import mongoose from "mongoose";
import { PriorityServiceDoc } from "@/app/priorityService/PriorityServiceTypes";
import { createModel } from "@/lib/mongoose/createModel";

const TRangeSchema = new mongoose.Schema(
  {
    min: { type: String, required: true },
    max: { type: String, required: true },
  },
  { _id: false },
);

const PriorityServiceSchema = new mongoose.Schema<PriorityServiceDoc>(
  {
    servId: { type: Number, required: true },
    date: { type: String },
    dateRange: { type: TRangeSchema },
    note: { type: String, required: true, default: "" },
    custDisplayName: { type: String, required: true, default: "" },
    servCodeId: { type: String, required: true, default: "" },
  },
  { timestamps: true },
);

PriorityServiceSchema.index({ servId: 1 }, { unique: true });

export const PriorityServiceModel = createModel(
  "PriorityService",
  PriorityServiceSchema,
);
