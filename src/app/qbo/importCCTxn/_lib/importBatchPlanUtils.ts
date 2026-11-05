import {
  BatchPreview,
  BatchPreviewMessage,
  BlockedRow,
  ImportRow,
  ImportRowStatus,
} from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { parseIsoDate } from "@/app/qbo/importCCTxn/_lib/importCsvValues";

// Pure planning for posting a date range. Nothing here touches the network, the database or the
// store, so the rules that keep a month of posting safe can be tested directly.

/** Intuit's limit on items in one /batch request. */
export const ROWS_PER_BATCH = 30;
/** Rows one posting request may take: 10 batches, well inside the route's time limit. */
export const MAX_ROWS_PER_REQUEST = 300;
/**
 * A row stuck in "posting" is one whose request died before it settled. It is only reconciled
 * after this long, because a younger one may still be in flight in another request.
 */
export const STUCK_POSTING_MS = 10 * 60 * 1000;

export function chunkItems<T>({ items, size }: { items: T[]; size: number }): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error("The chunk size must be a whole number of at least 1.");
  }
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

/** A message for the user, or null when both are real YYYY-MM-DD dates in order. Strict: the dates reach a query. */
export function validateBatchRange({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}): string | null {
  if (parseIsoDate(startDate) !== startDate || parseIsoDate(endDate) !== endDate) {
    return "Choose a start date and an end date.";
  }
  if (startDate > endDate) return "The start date must be on or before the end date.";
  return null;
}

/** A pending row, or a failed one (certain not to be in QuickBooks). */
export function isPostableStatus(status: ImportRowStatus): boolean {
  return status === "pending" || status === "failed";
}

/** Charges that can be posted and fall in the inclusive date range, oldest first. */
export function pickRowsInRange({
  rows,
  startDate,
  endDate,
}: {
  rows: ImportRow[];
  startDate: string;
  endDate: string;
}): ImportRow[] {
  return rows
    .filter(
      (row) =>
        isPostableStatus(row.status) &&
        row.kind === "charge" &&
        row.transactionDate >= startDate &&
        row.transactionDate <= endDate,
    )
    .sort(
      (a, b) =>
        a.transactionDate.localeCompare(b.transactionDate) || a.rowId.localeCompare(b.rowId),
    );
}

export function toBlockedRow({
  row,
  problems,
}: {
  row: Pick<ImportRow, "rowId" | "description" | "transactionDate" | "amountCents">;
  problems: string[];
}): BlockedRow {
  return {
    rowId: row.rowId,
    description: row.description,
    transactionDate: row.transactionDate,
    amountCents: row.amountCents,
    problems,
  };
}

/** Identical messages counted once, in the order first seen. */
export function aggregateMessages(messages: string[]): BatchPreviewMessage[] {
  const counts = new Map<string, number>();
  for (const message of messages) counts.set(message, (counts.get(message) ?? 0) + 1);
  return [...counts.entries()].map(([message, count]) => ({ message, count }));
}

export type BatchCandidate = {
  row: ImportRow;
  problems: string[];
  warnings: string[];
  isConfirmed: boolean;
};

/**
 * What a range would post. Rows with a problem are listed, not sent. The ready rows are cut to
 * the per-request cap, and the total, count and batch count describe only what will be sent.
 */
export function summarizeBatchPreview({
  candidates,
  startDate,
  endDate,
  unsettledRowCount,
}: {
  candidates: BatchCandidate[];
  startDate: string;
  endDate: string;
  unsettledRowCount: number;
}): BatchPreview {
  const ready = candidates.filter((candidate) => candidate.problems.length === 0);
  const blocked = candidates.filter((candidate) => candidate.problems.length > 0);
  const toSend = ready.slice(0, MAX_ROWS_PER_REQUEST);

  return {
    startDate,
    endDate,
    readyRowIds: toSend.map((candidate) => candidate.row.rowId),
    readyCount: toSend.length,
    readyTotalCents: toSend.reduce((total, candidate) => total + candidate.row.amountCents, 0),
    deferredCount: ready.length - toSend.length,
    batchCount: Math.ceil(toSend.length / ROWS_PER_BATCH),
    unconfirmedCount: toSend.filter((candidate) => !candidate.isConfirmed).length,
    warnings: aggregateMessages(toSend.flatMap((candidate) => candidate.warnings)),
    blockedRows: blocked.map((candidate) =>
      toBlockedRow({ row: candidate.row, problems: candidate.problems }),
    ),
    unsettledRowCount,
  };
}

/**
 * Whether a row's Ref no. may be looked up in QuickBooks. An unknown row always may. A posting
 * row only when it has been stuck for a long time, because a young one may be in flight.
 */
export function isReconcilable({
  status,
  updatedAtMs,
  nowMs,
}: {
  status: ImportRowStatus;
  updatedAtMs: number | null;
  nowMs: number;
}): boolean {
  if (status === "unknown") return true;
  if (status === "posting") return updatedAtMs !== null && nowMs - updatedAtMs >= STUCK_POSTING_MS;
  return false;
}
