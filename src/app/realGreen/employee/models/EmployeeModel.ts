import mongoose from "mongoose";
import { EmployeeDocProps } from "@/app/realGreen/employee/types/EmployeeTypes";
import { createModel } from "@/lib/mongoose/createModel";

const EmployeeSchema = new mongoose.Schema<EmployeeDocProps>(
  {
    employeeId: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
  },
  { timestamps: true },
);

export const EmployeeModel = createModel<EmployeeDocProps>("Employee", EmployeeSchema);
