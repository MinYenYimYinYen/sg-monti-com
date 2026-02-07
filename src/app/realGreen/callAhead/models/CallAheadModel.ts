import mongoose from "mongoose";
import { CallAheadDocProps } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";

interface CallAheadDoc extends CallAheadDocProps, mongoose.Document {}

const CallAheadSchema = new mongoose.Schema<CallAheadDoc>(
  {
    callAheadId: { type: Number, required: true, unique: true },
  },
  { timestamps: true },
);

const CallAheadModel =
  (mongoose.models?.CallAhead as mongoose.Model<CallAheadDoc>) ||
  mongoose.model<CallAheadDoc>("CallAhead", CallAheadSchema);

export default CallAheadModel;
