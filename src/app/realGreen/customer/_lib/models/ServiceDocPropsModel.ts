import mongoose from "mongoose";
import {
  Assignment,
  ServiceDocProps,
} from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { createModel } from "@/lib/mongoose/createModel";

interface ServiceDocPropsDoc extends mongoose.Document, ServiceDocProps {}

const assignmentSchema = new mongoose.Schema<Assignment>(
  {
    servId: { type: Number, required: true },
    employeeId: { type: String, required: true },
    schedDate: { type: String, required: true },
    status: { type: String, required: true },
  },
  {
    _id: false,
  },
);

const serviceDocPropsSchema = new mongoose.Schema<ServiceDocPropsDoc>(
  {
    servId: { type: Number, required: true, unique: true },
    assignments: { type: [assignmentSchema], required: true, default: [] },
  },
  {
    timestamps: true,
  },
);

export const ServiceDocPropsModel = createModel<ServiceDocPropsDoc>(
  "ServiceDocProps",
  serviceDocPropsSchema,
);
