import mongoose, { Schema } from "mongoose";
import { AssignmentPlan } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import { createModel } from "@/lib/mongoose/createModel";

interface AssignmentPlanDoc extends AssignmentPlan, mongoose.Document {}

const AssignmentPlanSchema = new Schema<AssignmentPlanDoc>({
  employeeId: { type: String, required: true },
  servCodeIds: { type: [String], required: true },
});

export const AssignmentPlanModel = createModel("AssignmentPlan", AssignmentPlanSchema);
