import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";

const AssignmentEntrySchema = new Schema(
  {
    kind: { type: String, enum: ["single", "group"], required: true },
    // single entry
    servCodeId: { type: String },
    // group entry
    servCodeIds: { type: [String] },
    label: { type: String },
  },
  { _id: false },
);

const AssignmentPlanSchema = new Schema({
  employeeId: { type: String, required: true },
  entries: { type: [AssignmentEntrySchema], required: true, default: [] },
});

export const AssignmentPlanModel = createModel("AssignmentPlan", AssignmentPlanSchema);
