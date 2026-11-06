import { qboQueryAll } from "@/app/qbo/_lib/api/qboQuery";
import { QboJournalEntry } from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import {
  buildJournalEntryDocNumberWhere,
  chunkJournalEntries,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryPayloadUtils";

// Server only. Reads QuickBooks. It never writes.

// Keeps each query's text short. The DocNumbers must already have passed isSafeDocNumber.
const DOC_NUMBERS_PER_QUERY = 30;

/** Every journal entry in QuickBooks that carries one of the DocNumbers. Always a fresh read. */
export async function findJournalEntriesByDocNumber(
  docNumbers: string[],
): Promise<QboJournalEntry[]> {
  const found: QboJournalEntry[] = [];
  for (const chunk of chunkJournalEntries({ items: docNumbers, size: DOC_NUMBERS_PER_QUERY })) {
    found.push(
      ...(await qboQueryAll<QboJournalEntry>({
        entity: "JournalEntry",
        where: buildJournalEntryDocNumberWhere(chunk),
      })),
    );
  }
  return found;
}
