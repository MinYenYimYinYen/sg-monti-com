import { headers } from "next/headers";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { AppError } from "@/lib/errors/AppError";
import UserModel from "@/app/auth/_models/UserModel";
import { JournalEntryPostingModel } from "@/app/qbo/journalEntry/models/JournalEntryPostingModel";
import {
  JournalEntryPosting,
  JournalEntryPostingContent,
  JournalEntryRange,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { JournalEntryDecision } from "@/app/qbo/journalEntry/_lib/qboJournalEntryOutcomeUtils";

// Server only. Reads and writes our own database. It never talks to QuickBooks.

export function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

/** The proxy injects the caller's saId; postings record who posted them by userName. */
export async function getPostingUserName(): Promise<string> {
  const headerStore = await headers();
  const saId = headerStore.get("x-user-id");
  await connectToMongoDB();
  const user = saId ? await UserModel.findOne({ saId }).lean() : null;
  if (!user) {
    throw new AppError({ message: "Authentication required", type: "AUTH_ERROR", statusCode: 401 });
  }
  return user.userName;
}

export async function loadPostingsByDocNumber(
  docNumbers: string[],
): Promise<Map<string, JournalEntryPosting>> {
  await connectToMongoDB();
  const docs = await JournalEntryPostingModel.find({ docNumber: { $in: docNumbers } }).lean();
  const postings = cleanMongoArray(docs) as JournalEntryPosting[];
  return new Map(postings.map((posting) => [posting.docNumber, posting]));
}

export async function loadPostingsInRange({
  startDate,
  endDate,
}: JournalEntryRange): Promise<JournalEntryPosting[]> {
  await connectToMongoDB();
  const docs = await JournalEntryPostingModel.find({ txnDate: { $gte: startDate, $lte: endDate } })
    .sort({ txnDate: 1, docNumber: 1 })
    .lean();
  return cleanMongoArray(docs) as JournalEntryPosting[];
}

function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === 11000;
}

export type SaveAheadResult = { saved: true } | { saved: false; problem: string };

/**
 * Writes the entry down as pending before anything is sent, so a crash cannot lose the fact that
 * we tried. A new DocNumber is inserted (the unique index settles a race). A pending or failed
 * posting is replaced with the new content. Any other status is locked.
 */
export async function savePendingPosting({
  content,
  existing,
}: {
  content: JournalEntryPostingContent;
  existing: JournalEntryPosting | undefined;
}): Promise<SaveAheadResult> {
  await connectToMongoDB();
  if (!existing) {
    try {
      await JournalEntryPostingModel.create({ ...content, status: "pending" });
      return { saved: true };
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      return { saved: false, problem: "Someone else just saved an entry with this DocNumber." };
    }
  }

  const replaced = await JournalEntryPostingModel.findOneAndUpdate(
    { docNumber: content.docNumber, status: { $in: ["pending", "failed"] } },
    {
      $set: { ...content, status: "pending" },
      $unset: { postMessage: 1, ...(content.privateNote ? {} : { privateNote: 1 }) },
    },
    { new: true },
  ).lean();
  if (replaced) return { saved: true };
  return {
    saved: false,
    problem: `This DocNumber is already ${existing.status}. A ${existing.status} entry cannot be sent again.`,
  };
}

/**
 * Moves the posting to "posting" only if it is still pending or failed, so two clicks or two
 * users cannot send the same entry twice. Returns null when someone else got there first.
 * What gets sent is the claimed document, so it is exactly what is stored.
 */
export async function claimPosting(docNumber: string): Promise<JournalEntryPosting | null> {
  const claimed = await JournalEntryPostingModel.findOneAndUpdate(
    { docNumber, status: { $in: ["pending", "failed"] } },
    { $set: { status: "posting" }, $unset: { postMessage: 1 } },
    { new: true },
  ).lean();
  return claimed ? (cleanMongoObject(claimed) as JournalEntryPosting) : null;
}

/** Stores what a posting attempt or a lookup concluded. A posted entry also keeps its QuickBooks Id. */
export async function recordDecision({
  docNumber,
  decision,
  postedByUserName,
}: {
  docNumber: string;
  decision: JournalEntryDecision;
  postedByUserName: string;
}): Promise<JournalEntryPosting> {
  const isPosted = decision.outcome === "posted" && decision.qboId !== null;
  const now = new Date().toISOString();
  const saved = await JournalEntryPostingModel.findOneAndUpdate(
    { docNumber },
    {
      $set: {
        status: decision.outcome,
        postMessage: decision.message,
        ...(isPosted
          ? {
              qboId: decision.qboId,
              ...(decision.qboSyncToken ? { qboSyncToken: decision.qboSyncToken } : {}),
              postedAt: now,
              postedByUserName,
              ...(decision.verified ? { verifiedAt: now } : {}),
            }
          : {}),
      },
    },
    { new: true },
  ).lean();
  return cleanMongoObject(saved!) as JournalEntryPosting;
}

/**
 * Marks an already posted entry as verified. Who posted it and when stay as they were, and the
 * QuickBooks Id is only filled in, never changed.
 */
export async function recordVerification({
  docNumber,
  qboId,
  qboSyncToken,
}: {
  docNumber: string;
  qboId: string;
  qboSyncToken: string | null;
}): Promise<JournalEntryPosting> {
  const saved = await JournalEntryPostingModel.findOneAndUpdate(
    { docNumber, status: "posted" },
    {
      $set: {
        verifiedAt: new Date().toISOString(),
        postMessage: "Found in QuickBooks by its DocNumber and it matches.",
        qboId,
        ...(qboSyncToken ? { qboSyncToken } : {}),
      },
    },
    { new: true },
  ).lean();
  if (!saved) throw validationError("That entry is no longer posted.");
  return cleanMongoObject(saved) as JournalEntryPosting;
}

/** Records a message without changing the status, for a posted entry QuickBooks could not confirm. */
export async function recordNote({
  docNumber,
  message,
}: {
  docNumber: string;
  message: string;
}): Promise<JournalEntryPosting> {
  const saved = await JournalEntryPostingModel.findOneAndUpdate(
    { docNumber },
    { $set: { postMessage: message } },
    { new: true },
  ).lean();
  return cleanMongoObject(saved!) as JournalEntryPosting;
}
