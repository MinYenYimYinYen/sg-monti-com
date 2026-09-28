import mongoose from "mongoose";
import { AssignmentDoc, ServiceAssignmentDoc } from "@/app/assignment/AssignmentTypes";
import { createModel } from "@/lib/mongoose/createModel";

// Each AssignmentDoc entry in the embedded array represents one scheduling event.
// The array is append-only — see AssignmentUtils for read rules.
const assignmentEntrySchema = new mongoose.Schema<AssignmentDoc>(
  {
    servId: { type: Number, required: true },
    employeeId: { type: String, required: true },
    schedDate: { type: String, required: true },
    status: { type: String, required: true },
    sequence: { type: Number, required: true, default: 0 },
    createdAt: { type: String, required: true },
  },
  {
    _id: false,
  },
);

const serviceAssignmentSchema = new mongoose.Schema<ServiceAssignmentDoc>(
  {
    servId: { type: Number, required: true, unique: true },
    assignments: { type: [assignmentEntrySchema], required: true, default: [] },
  },
  {
    timestamps: false,
  },
);

// Index for efficient date-based queries across all services
serviceAssignmentSchema.index({ "assignments.schedDate": 1 });
// Index for employee+date queries (loadout feedback, daily inventory)
serviceAssignmentSchema.index({ "assignments.employeeId": 1, "assignments.schedDate": 1 });

export const AssignmentModel = createModel<ServiceAssignmentDoc>(
  "Assignment",
  serviceAssignmentSchema,
);
