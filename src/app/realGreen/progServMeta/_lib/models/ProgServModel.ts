import mongoose, { Schema } from "mongoose";
import { ProgServ } from "@/app/realGreen/progServ/ProgServ";

const ProgServSchema = new Schema<ProgServ>(
  {
    progServId: { type: Number, required: true, unique: true },
    progDefId: { type: Number, required: true, index: true },
    servCodeId: { type: String, required: false, index: true }, // Can be null in raw type
    round: { type: Number, required: false },
    isDependent: { type: Boolean, required: true, default: false },
    do: { type: Boolean, required: true, default: false },
    skipAfter: { type: String, required: false },
  },
  { timestamps: true },
);

export const ProgServModel =
  mongoose.models.ProgServ ||
  mongoose.model<ProgServ>("ProgServ", ProgServSchema);
