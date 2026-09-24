import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { ServiceDocProps } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// ServiceDocProps is now just { servId, createdAt, updatedAt }.
// The assignments field has been moved to the standalone AssignmentModel.
// This model is kept for the extendServices pipeline until the full sync
// architecture replaces it (see customerSyncPlan.md).
const serviceDocPropsSchema = new mongoose.Schema<ServiceDocProps>(
  {
    servId: { type: Number, required: true, unique: true },
  },
  {
    timestamps: true,
  },
);

export const ServiceDocPropsModel = createModel<ServiceDocProps>(
  "ServiceDocProps",
  serviceDocPropsSchema,
);
