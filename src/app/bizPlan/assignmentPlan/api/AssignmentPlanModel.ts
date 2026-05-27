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

// ---------------------------------------------------------------------------
// Scenario Model
// ---------------------------------------------------------------------------

const AssignmentPlanEmbedSchema = new Schema(
  {
    employeeId: { type: String, required: true },
    entries: { type: [AssignmentEntrySchema], required: true, default: [] },
  },
  { _id: false },
);

const ScenarioSchema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: String, required: true },
  plans: { type: [AssignmentPlanEmbedSchema], required: true, default: [] },
});

export const ScenarioModel = createModel("AssignmentScenario", ScenarioSchema);
