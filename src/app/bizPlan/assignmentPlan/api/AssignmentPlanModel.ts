import { Schema } from "mongoose";
import { AssignmentPlan } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import { createModel } from "@/lib/mongoose/createModel";

const AssignmentPlanSchema = new Schema<AssignmentPlan>(
  {
    servCodeId: { type: String, required: true },
    employeeIds: { type: [String], required: true },
  },
);

export const AssignmentPlanModel = createModel("AssignmentPlan", AssignmentPlanSchema);