import { QboBatchResponse } from "@/app/qbo/_lib/types/QboCommonTypes";
import {
  JournalEntryPostOutcome,
  QboJournalEntry,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import {
  decideFromThrown,
  JournalEntryDecision,
  readJournalEntryBatchOutcome,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryOutcomeUtils";

// Pure logic for sending batches and reading what came back. Anything not certain is "unknown".

/** Each sent entry's decision from a batch answer, matched by bId. An entry QuickBooks did not answer for is unknown. */
export function decisionsFromResponse({
  response,
  docNumbers,
}: {
  response: QboBatchResponse<{ JournalEntry: QboJournalEntry }>;
  docNumbers: string[];
}): Map<string, JournalEntryDecision> {
  return new Map(
    docNumbers.map((docNumber): [string, JournalEntryDecision] => [
      docNumber,
      readJournalEntryBatchOutcome({ response, bId: docNumber }),
    ]),
  );
}

/** A request that threw settles every entry in it the same way: unknown if it may have landed, else failed. */
export function decisionsFromThrown({
  docNumbers,
  thrown,
}: {
  docNumbers: string[];
  thrown: { type: string; statusCode: number; message: string };
}): Map<string, JournalEntryDecision> {
  const decision = decideFromThrown(thrown);
  return new Map(
    docNumbers.map((docNumber): [string, JournalEntryDecision] => [docNumber, decision]),
  );
}

/** The run stops after any batch where a sent entry did not post. Entries that were never sent do not count. */
export function shouldStopAfter(outcomes: JournalEntryPostOutcome[]): boolean {
  return outcomes.some((outcome) => outcome !== "posted");
}

export function describeStop({
  batchNumber,
  batchCount,
  outcomes,
  notAttemptedCount,
}: {
  batchNumber: number;
  batchCount: number;
  outcomes: JournalEntryPostOutcome[];
  notAttemptedCount: number;
}): string {
  const count = (wanted: JournalEntryPostOutcome) =>
    outcomes.filter((outcome) => outcome === wanted).length;
  const parts = [`${count("posted")} posted`];
  if (count("failed") > 0) parts.push(`${count("failed")} failed`);
  if (count("unknown") > 0) parts.push(`${count("unknown")} need checking in QuickBooks`);
  if (count("pending") > 0) parts.push(`${count("pending")} sent back unposted`);
  const detail = parts.join(", ");

  // The last batch has nothing after it to hold back, so it is reported without "stopped".
  if (notAttemptedCount === 0) {
    return `Batch ${batchNumber} of ${batchCount} did not fully post (${detail}).`;
  }
  const entries = notAttemptedCount === 1 ? "entry was" : "entries were";
  return `Stopped after batch ${batchNumber} of ${batchCount} because not every entry posted (${detail}). ${notAttemptedCount} ${entries} not sent.`;
}
