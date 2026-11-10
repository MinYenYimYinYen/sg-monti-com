import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { DepositFieldMappingDoc } from "@/app/javelin/depositMapping/DepositFieldMappingTypes";
import { DEPOSIT_LINK_KEYS } from "@/app/javelin/_lib/ckDepositFields";

const DepositFieldMappingSchema = new Schema<DepositFieldMappingDoc>(
  {
    field: { type: String, required: true, unique: true, enum: DEPOSIT_LINK_KEYS },
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
