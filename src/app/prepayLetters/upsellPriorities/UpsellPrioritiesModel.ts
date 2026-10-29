import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import type { UpsellPrioritiesDoc } from "./upsellPrioritiesTypes";

const UpsellPrioritySchema = new mongoose.Schema(
  {
    progCodeId: { type: String, required: true },
    precludedBy: { type: [String], required: true, default: [] },
  },
  { _id: false },
);

const UpsellPrioritiesSchema = new mongoose.Schema<UpsellPrioritiesDoc>(
  {
    upsellPrioritiesId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    saId: { type: String, required: true, index: true },
    priorities: { type: [UpsellPrioritySchema], required: true, default: [] },
  },
  { timestamps: true },
);

UpsellPrioritiesSchema.index({ name: 1, saId: 1 }, { unique: true });

export const UpsellPrioritiesModel = createModel<UpsellPrioritiesDoc>(
  "UpsellPriorities",
  UpsellPrioritiesSchema,
);
