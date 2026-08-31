import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { FlagRule } from "@/app/flagRule/FlagRuleTypes";

const FlagRuleSchema = new mongoose.Schema<FlagRule>(
  {
    flagRuleId: { type: String, required: true },
    label: { type: String, required: true },
    kind: { type: String, required: true, enum: ["XOR", "NAND"] },
    flagIds: { type: [Number], required: true },
  },
  { timestamps: true },
);

FlagRuleSchema.index({ flagRuleId: 1 }, { unique: true });

export const FlagRuleModel = createModel<FlagRule>("FlagRule", FlagRuleSchema);
