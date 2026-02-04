import mongoose, { mongo } from "mongoose";
import { FlagDocProps } from "@/app/realGreen/flag/FlagTypes";

interface FlagDocPropsDoc extends mongoose.Document, FlagDocProps {}

const flagDocPropsSchema = new mongoose.Schema<FlagDocPropsDoc>(
  {
    flagId: { type: Number, required: true, unique: true },
    isOnCoverSheet: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const FlagDocPropsModel =
  (mongoose.models?.FlagDocProps as mongoose.Model<FlagDocPropsDoc>) ||
  mongoose.model<FlagDocPropsDoc>("FlagDocProps", flagDocPropsSchema);


