import mongoose from "mongoose";
import { MongoCallAhead } from "@/app/realGreen/callAhead/CallAhead";

interface CallAheadDoc extends MongoCallAhead, mongoose.Document {}

const CallAheadSchema = new mongoose.Schema(
  {
    callAheadId: { type: Number, required: true, unique: true },
  },
  { timestamps: true },
);

const CallAheadModel =
  (mongoose.models?.CallAhead as mongoose.Model<CallAheadDoc>) ||
  mongoose.model<CallAheadDoc>("CallAhead", CallAheadSchema);

export default CallAheadModel;
