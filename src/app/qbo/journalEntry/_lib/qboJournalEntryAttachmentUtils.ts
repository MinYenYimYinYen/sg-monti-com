import { UploadReading } from "@/app/qbo/attachable/_lib/qboAttachableUtils";
import { JournalEntryAttachmentStatus } from "@/app/qbo/journalEntry/types/QboJournalEntryAttachmentTypes";

// Pure rules for attaching stored files to a posted journal entry. The danger mirrors posting: a
// wrong "not attached" would send a file twice. So QuickBooks is always listed first, and a file
// that is already there is never sent again.

export type AttachmentAction = "skip" | "markUploaded" | "upload";

/**
 * What to do with one stored file, given what QuickBooks holds for the entry. A file we recorded as
 * uploaded is never sent again, even if it is gone from QuickBooks: someone may have removed it on
 * purpose, and a person has to look. A file found there is simply recorded as uploaded.
 */
export function decideAttachmentAction({
  status,
  foundInQuickBooks,
}: {
  status: JournalEntryAttachmentStatus;
  foundInQuickBooks: boolean;
}): AttachmentAction {
  if (status === "uploaded") return "skip";
  if (foundInQuickBooks) return "markUploaded";
  return "upload";
}

export type AttachmentOutcome = {
  status: JournalEntryAttachmentStatus;
  qboAttachableId?: string;
  message: string;
};

/** What an upload answer means for the stored file. Only a certain refusal is "failed". */
export function outcomeOfUpload(reading: UploadReading): AttachmentOutcome {
  if (reading.kind === "uploaded") {
    return {
      status: "uploaded",
      qboAttachableId: reading.attachableId,
      message: "Attached in QuickBooks.",
    };
  }
  if (reading.kind === "rejected") return { status: "failed", message: reading.message };
  return { status: "unknown", message: reading.message };
}
