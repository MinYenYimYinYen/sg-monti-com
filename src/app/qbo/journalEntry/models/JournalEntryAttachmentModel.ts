import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { JournalEntryAttachmentDoc } from "@/app/qbo/journalEntry/types/QboJournalEntryAttachmentTypes";

const JournalEntryAttachmentSchema = new Schema<JournalEntryAttachmentDoc>(
  {
    docNumber: { type: String, required: true },
    fileName: { type: String, required: true },
    contentType: { type: String, required: true },
    text: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "uploaded", "failed", "unknown"],
    },
    qboAttachableId: { type: String },
    message: { type: String },
  },
  { timestamps: true },
);
// The unique index is what stops two requests from storing the same file twice.
JournalEntryAttachmentSchema.index({ docNumber: 1, fileName: 1 }, { unique: true });

export const JournalEntryAttachmentModel = createModel<JournalEntryAttachmentDoc>(
  "QboJournalEntryAttachment",
  JournalEntryAttachmentSchema,
);
