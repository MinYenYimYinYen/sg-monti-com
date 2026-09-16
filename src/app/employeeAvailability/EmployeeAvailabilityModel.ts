import mongoose from "mongoose";
import { EmployeeAvailability } from "@/app/employeeAvailability/EmployeeAvailabilityTypes";
import { createModel } from "@/lib/mongoose/createModel";

const EmployeeAvailabilitySchema = new mongoose.Schema<EmployeeAvailability>(
  {
    employeeId: { type: String, required: true },
    startDate: { type: String },
    endDate: { type: String },
  },
  { timestamps: true },
);

EmployeeAvailabilitySchema.index({ employeeId: 1 }, { unique: true });

export const EmployeeAvailabilityModel = createModel(
  "EmployeeAvailability",
  EmployeeAvailabilitySchema,
);
