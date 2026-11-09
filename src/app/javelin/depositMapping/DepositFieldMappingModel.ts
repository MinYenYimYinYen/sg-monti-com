import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { DepositFieldMappingDoc } from "@/app/javelin/depositMapping/DepositFieldMappingTypes";
import { DEPOSIT_FIELDS } from "@/app/javelin/_lib/depositFields";

const DepositFieldMappingSchema = new Schema<DepositFieldMappingDoc>(
  {
    field: { type: String, required: true, unique: true, enum: DEPOSIT_FIELDS },
    qboAccountId: { type: String, required: true, index: true },
    defaultNameType: { type: String, enum: ["Customer", "Vendor"] },
    defaultNameId: { type: String },
  },
  { timestamps: true },
);

export const DepositFieldMappingModel = createModel<DepositFieldMappingDoc>(
  "JavelinDepositFieldMapping",
  DepositFieldMappingSchema,
);
