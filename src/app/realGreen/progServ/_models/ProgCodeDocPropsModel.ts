import mongoose from "mongoose";
import {
  ProgCodeDocProps,
} from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

interface ProgCodeDocPropsDoc extends mongoose.Document, ProgCodeDocProps {}

const ProgCodeDocPropsSchema = new mongoose.Schema<ProgCodeDocPropsDoc>({
  progCodeId: {type: String, required: true, unique: true},
  precludedIds: {type: [String], required: true, default: []}
})

export const ProgCodeDocPropsModel =
  (mongoose.models?.ProgCodeDocProps as mongoose.Model<ProgCodeDocProps>) ||
  mongoose.model<ProgCodeDocProps>("ProgCodeDocProps", ProgCodeDocPropsSchema);