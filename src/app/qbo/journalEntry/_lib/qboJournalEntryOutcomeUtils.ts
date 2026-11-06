import { QboBatchResponse, QboFault } from "@/app/qbo/_lib/types/QboCommonTypes";
import { describeFault } from "@/app/qbo/_lib/api/qboHttpUtils";
import {
  JournalEntryPostOutcome,
  QboJournalEntry,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";

// Pure rules for what a posting attempt means for a stored posting. The danger is a wrong
// "failed": a failed posting can be sent again, and an entry that did land would be entered
// twice. So anything not certain is "unknown", and unknown postings are reconciled before any retry.

export type JournalEntryDecision = {
  outcome: JournalEntryPostOutcome;
  qboId: string | null;
  qboSyncToken: string | null;
  /** True only when a separate read by DocNumber confirmed the entry. */
  verified: boolean;
  message: string;
};

export function noEntryDecision({
  outcome,
  message,
}: {
  outcome: JournalEntryPostOutcome;
  message: string;
}): JournalEntryDecision {
  return { outcome, qboId: null, qboSyncToken: null, verified: false, message };
}

// Errors that would hit every entry the same way, so the posting goes back to pending untouched
// (account period closed, subscription problem, authorization failure).
const STOP_BATCH_CODES = new Set(["6210", "6190", "120"]);

export function decideFromFault(fault: QboFault): JournalEntryDecision {
  const errors = fault.Error ?? [];
  const detail = describeFault({ errors }) ?? "QuickBooks rejected the journal entry.";
  const codes = errors.map((error) => error.code).join(", ");
  const text = codes ? `${detail} (code ${codes})` : detail;

  if (errors.some((error) => STOP_BATCH_CODES.has(String(error.code)))) {
    return noEntryDecision({
      outcome: "pending",
      message: `${text}. Nothing was posted. Fix this before trying again.`,
    });
  }
  return noEntryDecision({ outcome: "failed", message: text });
}

/**
 * A created item carries the JournalEntry with its Id. UNVERIFIED for journal entries: this shape
 * was only confirmed live for purchases. Anything unexpected is "unknown", never "posted", so the
 * posting is reconciled before any retry.
 */
export function readJournalEntryBatchOutcome({
  response,
  bId,
}: {
  response: QboBatchResponse<{ JournalEntry: QboJournalEntry }>;
  bId: string;
}): JournalEntryDecision {
  const item = response.BatchItemResponse?.find((candidate) => candidate.bId === bId);
  if (!item) {
    return noEntryDecision({
      outcome: "unknown",
      message: "QuickBooks did not answer for this entry. Check QuickBooks before posting again.",
    });
  }
  if (item.Fault) return decideFromFault(item.Fault);

  const created = item.JournalEntry;
  if (created?.Id) {
    return {
      outcome: "posted",
      qboId: created.Id,
      qboSyncToken: created.SyncToken ?? null,
      verified: false,
      message: "Posted to QuickBooks.",
    };
  }

  const keys = Object.keys(item).filter((key) => key !== "bId");
  return noEntryDecision({
    outcome: "unknown",
    message: `QuickBooks answered with an unexpected shape (keys: ${keys.join(", ") || "none"}). Check QuickBooks before posting again.`,
  });
}

/**
 * A request that never reached QuickBooks, or that it rejected whole with a client error, did
 * not create anything. A network failure or a server error may have happened after the entry
 * was saved, so those are unknown.
 */
export function decideFromThrown({
  type,
  statusCode,
  message,
}: {
  type: string;
  statusCode: number;
  message: string;
}): JournalEntryDecision {
  if (type === "NETWORK_ERROR" || statusCode >= 500) {
    return noEntryDecision({
      outcome: "unknown",
      message: `${message} The journal entry may or may not have been created. Check QuickBooks before posting again.`,
    });
  }
  return noEntryDecision({ outcome: "failed", message });
}
