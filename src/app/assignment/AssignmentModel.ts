import mongoose from "mongoose";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";
import { createModel } from "@/lib/mongoose/createModel";

const assignmentSchema = new mongoose.Schema<AssignmentDoc>(
  {
    servId: { type: Number, required: true, unique: true },
    employeeId: { type: String, required: true },
    schedDate: { type: String, required: true },
    status: { type: String, required: true },
    sequence: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  },
);

assignmentSchema.index({ schedDate: 1 });
assignmentSchema.index({ employeeId: 1, schedDate: 1 });

export const AssignmentModel = createModel<AssignmentDoc>("Assignment", assignmentSchema);
