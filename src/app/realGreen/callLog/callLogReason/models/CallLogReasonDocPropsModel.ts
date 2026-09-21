import mongoose from "mongoose";
import { CallLogReasonDocProps } from "@/app/realGreen/callLog/callLogReason/CallLogReasonTypes";
import { createModel } from "@/lib/mongoose/createModel";

const CallLogReasonDocPropsSchema = new mongoose.Schema<CallLogReasonDocProps>(
  {
    reasonId: { type: Number, required: true, unique: true },
  },
  { timestamps: true },
);

export const CallLogReasonDocPropsModel = createModel(
  "CallLogReasonDocProps",
  CallLogReasonDocPropsSchema,
);
