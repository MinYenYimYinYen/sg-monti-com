import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { SalesTaxMappingDoc } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";

const MnTaxTypeSchema = new Schema(
  {
    code: { type: String, required: true },
    description: { type: String, required: true },
    fipsCode: { type: String, default: null },
    ratePercent: { type: Number, required: true },
    jurisdiction: { type: String, required: true, enum: ["state", "county", "city", "region"] },
    effectiveFrom: { type: String, default: null },
    endedOn: { type: String, default: null },
  },
  { _id: false },
);

const SalesTaxMappingSchema = new Schema<SalesTaxMappingDoc>(
  {
    taxCodeId: { type: String, required: true, unique: true },
    mnTaxTypes: { type: [MnTaxTypeSchema], required: true, default: [] },
  },
  { timestamps: true },
);

export const SalesTaxMappingModel = createModel<SalesTaxMappingDoc>(
  "SalesTaxMapping",
  SalesTaxMappingSchema,
);
