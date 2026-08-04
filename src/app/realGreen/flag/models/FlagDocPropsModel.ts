import mongoose from "mongoose";
import { FlagDocProps } from "@/app/realGreen/flag/FlagTypes";
import { createModel } from "@/lib/mongoose/createModel";

const flagDocPropsSchema = new mongoose.Schema<FlagDocProps>(
  {
    flagId: { type: Number, required: true, unique: true },
  },
  { timestamps: true },
);

export const FlagDocPropsModel = createModel<FlagDocProps>("FlagDocProps", flagDocPropsSchema);
