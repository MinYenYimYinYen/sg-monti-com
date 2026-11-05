import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";

const ImportRowSchema = new Schema<ImportRow>(
  {
    rowId: { type: String, required: true, unique: true, index: true },
    formatId: { type: String, required: true },
    rowHash: { type: String, required: true },
    occurrence: { type: Number, required: true },
    last4: { type: String, required: true },
    transactionDate: { type: String, required: true },
    postedDate: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, default: "" },
    amountCents: { type: Number, required: true },
    kind: { type: String, required: true, enum: ["charge", "payment", "refund"] },
    merchantKey: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "skipped", "posting", "posted", "failed", "unknown"],
    },
    skipReason: { type: String },
    accountId: { type: String },
    possibleDuplicateOfHash: { type: String },
    importBatchId: { type: String, required: true },
    fileName: { type: String, required: true },
    importedByUserName: { type: String, required: true },
    docNumber: { type: String },
    qboPurchaseId: { type: String },
    postedAt: { type: String },
    postedByUserName: { type: String },
    postMessage: { type: String },
  },
  { timestamps: true },
);
// Duplicate detection reads by format and transaction date range.
ImportRowSchema.index({ formatId: 1, transactionDate: 1 });
ImportRowSchema.index({ status: 1 });

export const ImportRowModel = createModel<ImportRow>("QboImportRow", ImportRowSchema);
