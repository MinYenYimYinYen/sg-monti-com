import mongoose from "mongoose";
import { CallAheadDocProps } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { createModel } from "@/lib/mongoose/createModel";


const CallAheadDocPropsSchema = new mongoose.Schema<CallAheadDocProps>(
  {
    callAheadId: { type: Number, required: true, unique: true },
    keywordIds: { type: [String], required: true, default: [] },
    notificationTypes: { type: [String], required: true, default: [] },
    hasEta: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

export const CallAheadDocPropsModel = createModel("CallAheadDocProps", CallAheadDocPropsSchema)

