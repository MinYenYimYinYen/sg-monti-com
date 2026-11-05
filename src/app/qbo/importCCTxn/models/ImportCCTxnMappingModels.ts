import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import {
  CardAssignment,
  FormatAccount,
  MerchantMapping,
  SkipRule,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";

const FormatAccountSchema = new Schema<FormatAccount>(
  {
    formatId: { type: String, required: true, unique: true, index: true },
    accountIds: { type: [String], required: true },
    defaultAccountId: { type: String, required: true },
  },
  { timestamps: true },
);

const CardAssignmentSchema = new Schema<CardAssignment>(
  {
    formatId: { type: String, required: true },
    last4: { type: String, required: true },
    userName: { type: String, required: true },
    cardholderName: { type: String },
    accountId: { type: String },
  },
  { timestamps: true },
);
CardAssignmentSchema.index({ formatId: 1, last4: 1 }, { unique: true });

const MerchantMappingSchema = new Schema<MerchantMapping>(
  {
    merchantKey: { type: String, required: true },
    // Null means the mapping applies to everyone.
    ownerUserName: { type: String, default: null },
    vendorId: { type: String, required: true },
    defaultAccountId: { type: String, required: true },
    otherAccountIds: { type: [String], default: [] },
    confirmedMerchants: { type: [String], default: [] },
  },
  { timestamps: true },
);
MerchantMappingSchema.index({ merchantKey: 1, ownerUserName: 1 }, { unique: true });

const SkipRuleSchema = new Schema<SkipRule>(
  {
    merchantKey: { type: String, required: true, unique: true, index: true },
    reason: { type: String, required: true },
  },
  { timestamps: true },
);

export const ImportFormatAccountModel = createModel<FormatAccount>(
  "QboImportFormatAccount",
  FormatAccountSchema,
);
export const ImportCardAssignmentModel = createModel<CardAssignment>(
  "QboImportCardAssignment",
  CardAssignmentSchema,
);
export const ImportMerchantMappingModel = createModel<MerchantMapping>(
  "QboImportMerchantMapping",
  MerchantMappingSchema,
);
export const ImportSkipRuleModel = createModel<SkipRule>(
  "QboImportSkipRule",
  SkipRuleSchema,
);
