import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { SeasonIncreasesDoc } from "@/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes";

const SeasonIncreaseSchema = new Schema(
  {
    season: { type: Number, required: true },
    increasePercent: { type: Number, required: true },
  },
  { _id: false },
);

const SeasonIncreasesSchema = new Schema<SeasonIncreasesDoc>(
  {
    seasonIncreasesId: { type: String, required: true, unique: true, maxlength: 32 },
    label: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: false },
    seasonIncreases: { type: [SeasonIncreaseSchema], required: true, default: [] },
  },
  { timestamps: true },
);

export const SeasonIncreasesModel = createModel<SeasonIncreasesDoc>(
  "SeasonIncreases",
  SeasonIncreasesSchema,
);
