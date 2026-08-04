import mongoose from "mongoose";
import { ServiceDocProps } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { createModel } from "@/lib/mongoose/createModel";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";

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
