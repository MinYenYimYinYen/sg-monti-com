import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { JournalEntryPostingModel } from "@/app/qbo/journalEntry/models/JournalEntryPostingModel";
import { JournalEntryPosting } from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { JavelinKind, JavelinLatest, JavelinLatestEntry } from "@/app/javelin/JavelinTypes";

// Server only. Reads our own postings; never QuickBooks.

async function latestPosted(kind: JavelinKind): Promise<JavelinLatestEntry | null> {
  const doc = await JournalEntryPostingModel.findOne({ "source.kind": kind, status: "posted" })
    .sort({ txnDate: -1, docNumber: -1 })
    .lean();
  if (!doc) return null;
  const posting = cleanMongoObject(doc) as JournalEntryPosting;
  return {
    txnDate: posting.txnDate,
    docNumber: posting.docNumber,
    ...(posting.source?.kind === "deposit"
      ? { netDepositCents: posting.source.netDepositCents }
      : {}),
  };
}

/**
 * What was last posted for each kind, so the user knows which CSV data to export next. Entries
 * that are unknown or stuck posting are listed too: until they are settled, a date here might
 * be missing an entry that actually landed, or include one that did not.
 */
export async function loadJavelinLatest(): Promise<JavelinLatest> {
  await connectToMongoDB();
  const [genLedger, deposit, unsettled] = await Promise.all([
    latestPosted("genLedger"),
    latestPosted("deposit"),
    JournalEntryPostingModel.find({
      "source.kind": { $in: ["genLedger", "deposit"] },
      status: { $in: ["unknown", "posting"] },
    })
      .select({ docNumber: 1 })
      .lean(),
  ]);
  return {
    genLedger,
    deposit,
    unsettledDocNumbers: unsettled.map((posting) => posting.docNumber),
  };
}
