import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";

// ---------------------------------------------------------------------------
// Scenario Model
// ---------------------------------------------------------------------------

const AssignmentPlanSchema = new Schema(
  {
    employeeId: { type: String, required: true },
    groupIds: { type: [String], required: true, default: [] },
  },
  { _id: false },
);

const ScenarioSchema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
  isActive: { type: Boolean, required: true, default: false },
  plans: { type: [AssignmentPlanSchema], required: true, default: [] },
});

export const ScenarioModel = createModel("AssignmentScenario", ScenarioSchema);
