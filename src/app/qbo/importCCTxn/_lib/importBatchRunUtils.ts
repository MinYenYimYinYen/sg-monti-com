import { QboBatchResponse, QboBatchWriteItem } from "@/app/qbo/_lib/types/QboCommonTypes";
import { QboPurchase, QboPurchaseCreate } from "@/app/qbo/purchase/types/QboPurchaseTypes";
import {
  PostOutcome,
  PostResult,
  PostRowsResult,
} from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import {
  decideFromThrown,
  PostDecision,
  readBatchOutcome,
} from "@/app/qbo/importCCTxn/_lib/importPostOutcomeUtils";

// Pure logic for sending batches and reading what came back. A wrong "failed" can double-post
// and a wrong "posted" hides a missing expense, so anything not certain is "unknown".

export function buildBatchItems({
  entries,
}: {
  entries: { rowId: string; purchase: QboPurchaseCreate }[];
}): QboBatchWriteItem<{ Purchase: QboPurchaseCreate }>[] {
  return entries.map(({ rowId, purchase }) => ({
    bId: rowId,
    operation: "create",
    Purchase: purchase,
  }));
}

/** Each sent row's decision from a batch answer, matched by bId. A row QuickBooks did not answer for is unknown. */
export function decisionsFromResponse({
  response,
  rowIds,
}: {
  response: QboBatchResponse<{ Purchase: QboPurchase }>;
  rowIds: string[];
}): Map<string, PostDecision> {
  return new Map(
    rowIds.map((rowId): [string, PostDecision] => [
      rowId,
      readBatchOutcome({ response, bId: rowId }),
    ]),
  );
}

/** A request that threw settles every row in it the same way: unknown if it may have landed, else failed. */
export function decisionsFromThrown({
  rowIds,
  thrown,
}: {
  rowIds: string[];
  thrown: { type: string; statusCode: number; message: string };
}): Map<string, PostDecision> {
  const decision = decideFromThrown(thrown);
  return new Map(rowIds.map((rowId): [string, PostDecision] => [rowId, decision]));
}

export function countOutcomes(outcomes: PostOutcome[]): Record<PostOutcome, number> {
  const counts: Record<PostOutcome, number> = { posted: 0, failed: 0, unknown: 0, pending: 0 };
  for (const outcome of outcomes) counts[outcome] += 1;
  return counts;
}

/** The run stops after any batch where a sent row did not post. Rows that were never sent do not count. */
export function shouldStopAfter(outcomes: PostOutcome[]): boolean {
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
  outcomes: PostOutcome[];
  notAttemptedCount: number;
}): string {
  const counts = countOutcomes(outcomes);
  const parts = [`${counts.posted} posted`];
  if (counts.failed > 0) parts.push(`${counts.failed} failed`);
  if (counts.unknown > 0) parts.push(`${counts.unknown} need checking in QuickBooks`);
  if (counts.pending > 0) parts.push(`${counts.pending} sent back unposted`);
  const detail = parts.join(", ");

  // The last batch has nothing after it to hold back, so it is reported without "stopped".
  if (notAttemptedCount === 0) {
    return `Batch ${batchNumber} of ${batchCount} did not fully post (${detail}).`;
  }
  const rows = notAttemptedCount === 1 ? "row was" : "rows were";
  return `Stopped after batch ${batchNumber} of ${batchCount} because not every row posted (${detail}). ${notAttemptedCount} ${rows} not sent.`;
}

export type PostRunSummary = {
  postedCount: number;
  postedCents: number;
  failedCount: number;
  unknownCount: number;
  pendingCount: number;
  blockedCount: number;
  notAttemptedCount: number;
};

export function summarizeRun(run: PostRowsResult): PostRunSummary {
  const posted = run.results.filter((result) => result.outcome === "posted");
  const counts = countOutcomes(run.results.map((result) => result.outcome));
  return {
    postedCount: posted.length,
    postedCents: posted.reduce((total, result) => total + result.row.amountCents, 0),
    failedCount: counts.failed,
    unknownCount: counts.unknown,
    pendingCount: counts.pending,
    blockedCount: run.blockedRows.length,
    notAttemptedCount: run.notAttemptedRowIds.length,
  };
}

/** A run made only of settled rows, such as the result of looking rows up in QuickBooks. */
export function settledRun(results: PostResult[]): PostRowsResult {
  return { results, blockedRows: [], notAttemptedRowIds: [], stopReason: null };
}
