import { AppError } from "@/lib/errors/AppError";
import { qboApi } from "@/app/qbo/_lib/api/qboApi";
import { qboConst } from "@/app/qbo/_lib/qboConst";
import { QboBatchResponse } from "@/app/qbo/_lib/types/QboCommonTypes";
import {
  JournalEntryInput,
  JournalEntryPosting,
  JournalEntryPostingContent,
  JournalEntryPostResult,
  PostJournalEntriesResult,
  QboJournalEntry,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import {
  buildJournalEntryBatchItems,
  chunkJournalEntries,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryPayloadUtils";
import { JournalEntryDecision } from "@/app/qbo/journalEntry/_lib/qboJournalEntryOutcomeUtils";
import {
  decisionsFromResponse,
  decisionsFromThrown,
  describeStop,
  shouldStopAfter,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryRunUtils";
import {
  claimPosting,
  recordDecision,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntrySettleServer";
import {
  prepareEntries,
  validateRequest,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryPreflightServer";

// Server only. The ONLY code that writes journal entries to QuickBooks (POST /batch). Admin only
// (see the route).
//
// A run posts the requested entries in batches of 30. Safety rules, in order:
// 1. Every entry is checked against fresh QuickBooks data first, and written down as pending. An
//    entry that fails a check is blocked and never sent.
// 2. An entry is claimed (pending or failed to posting) atomically before it is sent, so two
//    clicks or two users cannot send it twice.
// 3. The run stops after the first batch in which any sent entry did not post. The rest stay
//    pending, so a surprise never spreads across a whole request.
// 4. A request that dies after sending leaves its entries "unknown", never "failed", and they
//    are looked up by DocNumber before any retry (see qboJournalEntryReconcileServer).

function describeThrown(error: unknown): { type: string; statusCode: number; message: string } {
  const appError = error instanceof AppError ? error : null;
  return {
    type: appError?.type ?? "UNKNOWN_ERROR",
    statusCode: appError?.statusCode ?? 500,
    message: appError?.message ?? "The request to QuickBooks failed unexpectedly.",
  };
}

/** Sends one batch of claimed postings and returns what each entry's answer means. */
async function sendBatch(
  claimed: JournalEntryPosting[],
): Promise<Map<string, JournalEntryDecision>> {
  const docNumbers = claimed.map((posting) => posting.docNumber);
  try {
    const response = await qboApi<QboBatchResponse<{ JournalEntry: QboJournalEntry }>>({
      path: "/batch",
      method: "POST",
      pathTemplate: "/batch",
      timeoutMs: qboConst.batchRequestTimeoutMs,
      body: { BatchItemRequest: buildJournalEntryBatchItems(claimed) },
    });
    return decisionsFromResponse({ response, docNumbers });
  } catch (error) {
    return decisionsFromThrown({ docNumbers, thrown: describeThrown(error) });
  }
}

/** Claims each posting of a batch. One someone else took is left out of the request. */
async function claimBatch(batch: JournalEntryPostingContent[]): Promise<JournalEntryPosting[]> {
  const claimed: JournalEntryPosting[] = [];
  for (const content of batch) {
    const posting = await claimPosting(content.docNumber);
    if (posting) claimed.push(posting);
  }
  return claimed;
}

/**
 * Posts the requested entries. See the rules at the top of this file. Everything that was not
 * sent is reported with a reason, so the caller sees exactly what happened to every entry.
 */
export async function postQboJournalEntries({
  entries,
  postedByUserName,
}: {
  entries: JournalEntryInput[];
  postedByUserName: string;
}): Promise<PostJournalEntriesResult> {
  validateRequest(entries);
  const { ready, blockedEntries } = await prepareEntries(entries);

  const batches = chunkJournalEntries({ items: ready, size: qboConst.journalEntryBatchSize });
  const results: JournalEntryPostResult[] = [];
  let stopReason: string | null = null;
  let sentBatchCount = batches.length;

  for (const [batchIndex, batch] of batches.entries()) {
    const claimed = await claimBatch(batch);
    const claimedDocNumbers = new Set(claimed.map((posting) => posting.docNumber));
    for (const content of batch) {
      if (!claimedDocNumbers.has(content.docNumber)) {
        blockedEntries.push({
          docNumber: content.docNumber,
          problems: ["Someone else is already posting this entry."],
        });
      }
    }
    if (claimed.length === 0) continue;

    const decisions = await sendBatch(claimed);
    const outcomes: JournalEntryPostResult["outcome"][] = [];
    for (const posting of claimed) {
      const decision = decisions.get(posting.docNumber)!;
      const saved = await recordDecision({
        docNumber: posting.docNumber,
        decision,
        postedByUserName,
      });
      results.push({ posting: saved, outcome: decision.outcome });
      outcomes.push(decision.outcome);
    }

    if (shouldStopAfter(outcomes)) {
      sentBatchCount = batchIndex + 1;
      stopReason = describeStop({
        batchNumber: batchIndex + 1,
        batchCount: batches.length,
        outcomes,
        notAttemptedCount: batches.slice(sentBatchCount).flat().length,
      });
      break;
    }
  }

  const notAttemptedDocNumbers = batches
    .slice(sentBatchCount)
    .flat()
    .map((content) => content.docNumber);
  return { results, blockedEntries, notAttemptedDocNumbers, stopReason };
}
