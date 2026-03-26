import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { AppMethodDoc } from "./AppMethodTypes";

const AppMethodSchema = new mongoose.Schema<AppMethodDoc>(
  {
    appMethodId: { type: String, required: true, unique: true },
    description: { type: String, required: true },

    // Flow rate (volume per time)
    flowRate: {
      volume: { type: Number, required: true },
      volumeUnit: { type: String, required: true },
      time: { type: Number, required: true },
      timeUnit: { type: String, required: true },
    },

    // Ground speed (distance per time)
    groundSpeed: {
      distance: { type: Number, required: true },
      distanceUnit: { type: String, required: true },
      time: { type: Number, required: true },
      timeUnit: { type: String, required: true },
    },

    // Pattern width (distance)
    patternWidth: {
      distance: { type: Number, required: true },
      distanceUnit: { type: String, required: true },
    },

    // Coverage (volume per area)
    coverage: {
      volume: { type: Number, required: true },
      volumeUnit: { type: String, required: true },
      area: { type: Number, required: true },
      areaUnit: { type: String, required: true },
    },

    // Overlap multiplier
    overlap: { type: Number, required: true },
  },
  { timestamps: true },
);

export const AppMethodModel = createModel("AppMethod", AppMethodSchema);
