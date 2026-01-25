import mongoose from "mongoose";
import {EmployeeDocProps} from "@/app/realGreen/employee/types/EmployeeTypes";

interface EmployeeDoc extends EmployeeDocProps, mongoose.Document {}

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
  },
  { timestamps: true },
);

const EmployeeModel =
  (mongoose.models?.Employee as mongoose.Model<EmployeeDoc>) ||
  mongoose.model<EmployeeDoc>("Employee", EmployeeSchema);

export default EmployeeModel;
