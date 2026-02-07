import mongoose from "mongoose";
import { ServCodeDocProps } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

interface ServCodeDoc extends ServCodeDocProps, mongoose.Document {}

const ServCodeSchema = new mongoose.Schema(
  {
    servCodeId: { type: String, required: true, unique: true },
    begin: { type: String },
    end: { type: String },
    alwaysAsap: { type: Boolean },
  },
  { timestamps: true },
);

const ServCodeModel =
  (mongoose.models?.ServCode as mongoose.Model<ServCodeDoc>) ||
  mongoose.model<ServCodeDoc>("ServCode", ServCodeSchema);

export default ServCodeModel;
