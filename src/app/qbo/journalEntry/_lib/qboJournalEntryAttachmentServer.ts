import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { findAttachmentsForEntity, uploadQboAttachment } from "@/app/qbo/attachable/_lib/qboAttachableServer";
import { findAttachmentByFileName } from "@/app/qbo/attachable/_lib/qboAttachableUtils";
import { QboAttachmentFile } from "@/app/qbo/attachable/types/QboAttachableTypes";
import { JournalEntryAttachmentModel } from "@/app/qbo/journalEntry/models/JournalEntryAttachmentModel";
import { JournalEntryAttachmentDoc } from "@/app/qbo/journalEntry/types/QboJournalEntryAttachmentTypes";
import { JournalEntryPosting } from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import {
  AttachmentOutcome,
  decideAttachmentAction,
  outcomeOfUpload,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryAttachmentUtils";

// Server only. Files that go on a posted journal entry. Safety rules, like posting:
// 1. The files are written down as pending before anything is sent, so a retry sends the same bytes.
// 2. A file is only sent after the entry is posted and QuickBooks has been listed for what it holds.
// 3. A request that may have landed leaves the file "unknown", never "failed".

function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === 11000;
}

/**
 * Stores each file as pending. A file already uploaded or unknown is left exactly as it is, so a
 * second post never replaces what was already sent. A pending or failed one takes the new text.
 */
export async function saveAttachmentsAhead({
  docNumber,
  files,
}: {
  docNumber: string;
  files: QboAttachmentFile[];
}): Promise<void> {
  await connectToMongoDB();
  for (const file of files) {
    try {
      await JournalEntryAttachmentModel.updateOne(
        { docNumber, fileName: file.fileName, status: { $in: ["pending", "failed"] } },
        {
          $set: { contentType: file.contentType, text: file.text, status: "pending" },
          $unset: { message: 1 },
        },
        { upsert: true },
      );
    } catch (error) {
      // The unique index fired: the file exists and is uploaded or unknown, which stays as it is.
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
}

/** The stored files of one entry, in the order they were saved. */
export async function loadAttachmentDocs(docNumber: string): Promise<JournalEntryAttachmentDoc[]> {
  await connectToMongoDB();
  const docs = await JournalEntryAttachmentModel.find({ docNumber })
    .sort({ createdAt: 1, fileName: 1 })
    .lean();
  return cleanMongoArray(docs) as JournalEntryAttachmentDoc[];
}

/**
 * Moves a pending or failed file to "unknown" before it is sent, so two requests cannot both send
 * it, and a crash mid-upload leaves it honestly unknown. Null when someone else took it.
 */
async function claimAttachment({
  docNumber,
  fileName,
}: {
  docNumber: string;
  fileName: string;
}): Promise<JournalEntryAttachmentDoc | null> {
  const claimed = await JournalEntryAttachmentModel.findOneAndUpdate(
    { docNumber, fileName, status: { $in: ["pending", "failed"] } },
    { $set: { status: "unknown", message: "Upload started. If this stays, check QuickBooks." } },
    { new: true },
  ).lean();
  return claimed ? (cleanMongoObject(claimed) as JournalEntryAttachmentDoc) : null;
}

async function recordAttachmentOutcome({
  docNumber,
  fileName,
  outcome,
}: {
  docNumber: string;
  fileName: string;
  outcome: AttachmentOutcome;
}): Promise<void> {
  await JournalEntryAttachmentModel.updateOne(
    { docNumber, fileName },
    {
      $set: {
        status: outcome.status,
        message: outcome.message,
        ...(outcome.qboAttachableId ? { qboAttachableId: outcome.qboAttachableId } : {}),
      },
    },
  );
}

/**
 * Attaches every stored file of a posted entry that is not attached yet, one at a time. QuickBooks
 * is listed first, so a file already there is recorded and never sent again. Returns the stored
 * files as they stand afterwards. Throws if QuickBooks cannot be listed; nothing is sent then.
 */
export async function attachFilesToPosting(
  posting: JournalEntryPosting,
): Promise<JournalEntryAttachmentDoc[]> {
  const docs = await loadAttachmentDocs(posting.docNumber);
  if (posting.status !== "posted" || !posting.qboId) return docs;
  if (docs.every((doc) => doc.status === "uploaded")) return docs;

  const entityId = posting.qboId;
  const inQuickBooks = await findAttachmentsForEntity({ entityType: "JournalEntry", entityId });

  for (const doc of docs) {
    const found = findAttachmentByFileName({ attachables: inQuickBooks, fileName: doc.fileName });
    const action = decideAttachmentAction({ status: doc.status, foundInQuickBooks: Boolean(found) });
    if (action === "skip") continue;

    if (action === "markUploaded") {
      await recordAttachmentOutcome({
        docNumber: doc.docNumber,
        fileName: doc.fileName,
        outcome: {
          status: "uploaded",
          qboAttachableId: found!.Id,
          message: "Found in QuickBooks.",
        },
      });
      continue;
    }

    // An unknown file was just looked up and is not there, so it can be sent. Pending and failed
    // ones are claimed first. Two simultaneous retries of an unknown file could both send it; the
    // worst result is a duplicate attachment, which is harmless.
    const toSend = doc.status === "unknown" ? doc : await claimAttachment(doc);
    if (!toSend) continue;

    const reading = await uploadQboAttachment({
      file: { fileName: toSend.fileName, contentType: toSend.contentType, text: toSend.text },
      entityType: "JournalEntry",
      entityId,
    });
    await recordAttachmentOutcome({
      docNumber: toSend.docNumber,
      fileName: toSend.fileName,
      outcome: outcomeOfUpload(reading),
    });
  }
  return loadAttachmentDocs(posting.docNumber);
}
