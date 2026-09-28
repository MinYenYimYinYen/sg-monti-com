import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";

// ServiceDocProps is hardcoded here (not imported from ServiceTypes) because
// ServiceDocProps was removed from the type system as part of the sync architecture
// refactor. The type is preserved here to match the live MongoDB collection shape
// on master until this branch is merged.
//
// Pre-merge checklist:
//   1. Drop the ServiceDocProps MongoDB collection
//   2. Delete this file
// See customerSyncPlan.md for context.
type ServiceDocProps = {
  servId: number;
  assignments: AssignmentDoc[];
  createdAt: string;
  updatedAt: string;
};

const assignmentSchema = new mongoose.Schema<AssignmentDoc>(
  {
    servId: { type: Number, required: true },
    employeeId: { type: String, required: true },
    schedDate: { type: String, required: true },
    status: { type: String, required: true },
    sequence: { type: Number, required: true, default: 0 },
  },
  {
    _id: false,
  },
);

const serviceDocPropsSchema = new mongoose.Schema<ServiceDocProps>(
  {
    servId: { type: Number, required: true, unique: true },
    assignments: { type: [assignmentSchema], required: true, default: [] },
  },
  {
    timestamps: true,
  },
);

export const ServiceDocPropsModel = createModel<ServiceDocProps>(
  "ServiceDocProps",
  serviceDocPropsSchema,
);
