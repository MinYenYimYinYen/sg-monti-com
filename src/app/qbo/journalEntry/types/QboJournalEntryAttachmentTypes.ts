import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

/**
 * Pending: saved, not sent. Uploaded: QuickBooks answered with the attachment and its Id. Failed:
 * QuickBooks rejected it, so it is certain not to be attached. Unknown: the request may or may not
 * have landed; the entry's attachments are listed in QuickBooks before any resend.
 */
export type JournalEntryAttachmentStatus = "pending" | "uploaded" | "failed" | "unknown";

/**
 * A file that goes on a journal entry in QuickBooks. Natural key: docNumber plus fileName. The text
 * is stored before anything is sent, so a retry sends exactly the same bytes.
 *
 * Person reference: none. Who posted the entry is on the posting, so nothing here belongs in
 * `deleteUserReferences`.
 */
export type JournalEntryAttachmentDoc = CreatedUpdated & {
  docNumber: string;
  fileName: string;
  contentType: string;
  text: string;
  status: JournalEntryAttachmentStatus;
  qboAttachableId?: string;
  message?: string;
};
