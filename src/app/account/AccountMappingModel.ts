import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { AccountMappingDoc } from "@/app/account/AccountMappingTypes";

const AccountMappingSchema = new Schema<AccountMappingDoc>(
  {
    rgAccountId: { type: String, required: true, unique: true },
    qboAccountId: { type: String, required: true, index: true },
    defaultNameType: { type: String, enum: ["Customer", "Vendor"] },
    defaultNameId: { type: String },
  },
  { timestamps: true },
);

export const AccountMappingModel = createModel<AccountMappingDoc>(
  "AccountMapping",
  AccountMappingSchema,
);
