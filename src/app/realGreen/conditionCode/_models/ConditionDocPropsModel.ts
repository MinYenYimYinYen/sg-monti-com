import mongoose from "mongoose";
import { ConditionDocProps } from "@/app/realGreen/conditionCode/_types/ConditionCodeTypes";
import { createModel } from "@/lib/mongoose/createModel";

const ConditionDocPropsSchema = new mongoose.Schema<ConditionDocProps>({
  conditionId: { type: String, required: true, unique: true },
  upsellProgCodeIds: { type: [String], required: true, default: [] },
});

export const ConditionDocPropsModel = createModel<ConditionDocProps>(
  "ConditionDocProps",
  ConditionDocPropsSchema,
);
