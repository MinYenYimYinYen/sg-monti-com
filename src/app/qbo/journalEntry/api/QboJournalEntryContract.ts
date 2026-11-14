import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import {
  JournalEntryInput,
  JournalEntryPosting,
  JournalEntryRange,
  PostJournalEntriesResult,
  ReconcileJournalEntriesResult,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";

// Posting writes to the real books, so it has its own capability (qboJournalEntries.write).
export interface QboJournalEntryContract extends ApiContract {
  // The only write to QuickBooks. Posts in batches of 30 and stops after the first batch in
  // which any entry did not post. DocNumber is required on every entry.
  postMany: {
    params: { entries: JournalEntryInput[] };
    result: DataResponse<PostJournalEntriesResult>;
  };
  // A read of QuickBooks that settles unknown or unverified entries. Creates nothing.
  reconcile: {
    params: { docNumbers: string[] };
    result: DataResponse<ReconcileJournalEntriesResult>;
  };
  // A read of our own stored postings. Does not touch QuickBooks.
  getByDateRange: {
    params: JournalEntryRange;
    result: DataResponse<JournalEntryPosting[]>;
  };
}
