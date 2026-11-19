import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { StateTaxRevenueGroupDoc } from "@/app/salesTax/stateTaxRevenueGroups/StateTaxRevenueGroupTypes";

const StateTaxRevenueGroupSchema = new Schema<StateTaxRevenueGroupDoc>(
  {
    mnTaxCode: { type: String, required: true, unique: true },
    revenueGroupKey: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export const StateTaxRevenueGroupModel = createModel<StateTaxRevenueGroupDoc>(
  "StateTaxRevenueGroup",
  StateTaxRevenueGroupSchema,
);
