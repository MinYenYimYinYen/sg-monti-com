import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";

// ---------------------------------------------------------------------------
// Scenario Model
// ---------------------------------------------------------------------------

const AssignmentEntrySchema = new Schema(
  {
    kind: { type: String, enum: ["single", "group"], required: true },
    // single entry
    servCodeId: { type: String },
    // group entry — old format (inline servCodeIds)
    servCodeIds: { type: [String] },
    label: { type: String },
    // group entry — new format (reference to shared AssignmentGroup)
    groupId: { type: String },
  },
  { _id: false },
);

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
  updatedAt: { type: String, required: true },
  isActive: { type: Boolean, required: true, default: false },
  plans: { type: [AssignmentPlanEmbedSchema], required: true, default: [] },
});

export const ScenarioModel = createModel("AssignmentScenario", ScenarioSchema);
