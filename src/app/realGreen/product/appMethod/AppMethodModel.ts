import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { AppMethodDoc } from "./AppMethodTypes";

const AppMethodSchema = new mongoose.Schema<AppMethodDoc>(
  {
    appMethodId: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    speed: { type: Number, required: true },
    doubleOverlap: { type: Boolean, required: true },
    width: { type: Number, required: true },
    flowRate: { type: Number, required: true },
    flowRateUnitId: { type: Number, required: true },
  },
  { timestamps: true },
);

export const AppMethodModel = createModel("AppMethod", AppMethodSchema);
