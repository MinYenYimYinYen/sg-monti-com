import { qboConst } from "@/app/qbo/_lib/qboConst";
import {
  JournalEntryPosting,
  JournalEntryRange,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { validateJournalEntryRange } from "@/app/qbo/journalEntry/_lib/qboJournalEntryUtils";
import {
  loadPostingsInRange,
  validationError,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntrySettleServer";

// Server only. Reads our own stored postings. It never talks to QuickBooks.

/** Stored postings for a date range, oldest first. The dates are checked here, not only in the browser. */
export async function loadQboJournalEntryPostings(
  range: JournalEntryRange,
): Promise<JournalEntryPosting[]> {
  const problem = validateJournalEntryRange({ range, maxDays: qboConst.journalEntryMaxRangeDays });
  if (problem) throw validationError(problem);
  return loadPostingsInRange(range);
}
