import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import {
  JournalEntryPosting,
  JournalEntryPostingLine,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";

const JournalEntryPostingLineSchema = new Schema<JournalEntryPostingLine>(
  {
    postingType: { type: String, required: true, enum: ["Debit", "Credit"] },
    accountId: { type: String, required: true },
    accountName: { type: String, required: true },
    amountCents: { type: Number, required: true },
    description: { type: String },
    entityType: { type: String, enum: ["Customer", "Vendor"] },
    entityId: { type: String },
  },
  { _id: false },
);

const JournalEntryPostingSchema = new Schema<JournalEntryPosting>(
  {
    // The unique index is what stops two requests from creating the same posting.
    docNumber: { type: String, required: true, unique: true, index: true },
    txnDate: { type: String, required: true },
    privateNote: { type: String },
    lines: { type: [JournalEntryPostingLineSchema], required: true },
    totalCents: { type: Number, required: true },
    // A union by kind (see JournalEntrySource), so it is stored as-is and typed in TypeScript.
    source: { type: Schema.Types.Mixed },
    status: {
      type: String,
      required: true,
      enum: ["pending", "posting", "posted", "failed", "unknown"],
    },
    qboId: { type: String },
    qboSyncToken: { type: String },
    postMessage: { type: String },
    postedByUserName: { type: String },
    postedAt: { type: String },
    verifiedAt: { type: String },
  },
  { timestamps: true },
);
JournalEntryPostingSchema.index({ txnDate: 1 });
JournalEntryPostingSchema.index({ status: 1 });
// "Latest entry of this kind" and duplicate lookup by source.
JournalEntryPostingSchema.index({ "source.kind": 1, txnDate: -1 });
JournalEntryPostingSchema.index({ "source.sourceHash": 1 });

export const JournalEntryPostingModel = createModel<JournalEntryPosting>(
  "QboJournalEntryPosting",
  JournalEntryPostingSchema,
);
