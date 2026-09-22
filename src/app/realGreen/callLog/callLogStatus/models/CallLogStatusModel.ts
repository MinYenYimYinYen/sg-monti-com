import mongoose from "mongoose";
import { CallLogStatus } from "@/app/realGreen/callLog/callLogStatus/CallLogStatusTypes";
import { createModel } from "@/lib/mongoose/createModel";

const CallLogStatusSchema = new mongoose.Schema<CallLogStatus>(
  {
    code: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    resolved: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const CallLogStatusModel = createModel("CallLogStatus", CallLogStatusSchema);
