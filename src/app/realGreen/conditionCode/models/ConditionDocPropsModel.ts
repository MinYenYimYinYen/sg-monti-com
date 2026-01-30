import mongoose from "mongoose";
import { ConditionDocProps } from "../types/ConditionCode";

interface ConditionDocPropsDoc extends mongoose.Document, ConditionDocProps {}

const ConditionDocPropsSchema = new mongoose.Schema<ConditionDocPropsDoc>({
  conditionId: { type: String, required: true, unique: true },
  upsellProgCodeIds: { type: [String], required: true, default: [] },
});

export const ConditionDocPropsModel =
  (mongoose.models?.ConditionDocProps as mongoose.Model<ConditionDocProps>) ||
  mongoose.model<ConditionDocProps>(
    "ConditionDocProps",
    ConditionDocPropsSchema,
  );
