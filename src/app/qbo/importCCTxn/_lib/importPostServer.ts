import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { AppError } from "@/lib/errors/AppError";
import { qboApi } from "@/app/qbo/_lib/api/qboApi";
import { qboConst } from "@/app/qbo/_lib/qboConst";
import { QboBatchResponse } from "@/app/qbo/_lib/types/QboCommonTypes";
import { QboPurchase } from "@/app/qbo/purchase/types/QboPurchaseTypes";
import {
  ImportRow,
  PostOutcome,
  PostResult,
  PostRowsResult,
} from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { ImportRowModel } from "@/app/qbo/importCCTxn/models/ImportRowModel";
import { ImportMerchantMappingModel } from "@/app/qbo/importCCTxn/models/ImportCCTxnMappingModels";
import { MerchantMapping } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { shouldRememberAccount } from "@/app/qbo/importCCTxn/_lib/importAccountUtils";
import { PostDecision } from "@/app/qbo/importCCTxn/_lib/importPostOutcomeUtils";
import {
  chunkItems,
  MAX_ROWS_PER_REQUEST,
  ROWS_PER_BATCH,
  toBlockedRow,
} from "@/app/qbo/importCCTxn/_lib/importBatchPlanUtils";
import {
  buildBatchItems,
  decisionsFromResponse,
  decisionsFromThrown,
  describeStop,
  shouldStopAfter,
} from "@/app/qbo/importCCTxn/_lib/importBatchRunUtils";
import { planPostRows, ReadyRow } from "@/app/qbo/importCCTxn/_lib/importPostContextUtils";
import {
  loadPostContext,
  loadRowsById,
  validationError,
} from "@/app/qbo/importCCTxn/_lib/importPostLookupServer";
import { recordDecision } from "@/app/qbo/importCCTxn/_lib/importRowSettleServer";

// Server only. The ONLY code that writes purchases to QuickBooks (POST /batch).
//
// A run posts the requested rows in batches of 30. Safety rules, in order:
// 1. Every row is checked against fresh QuickBooks data first. A row that fails is blocked and
//    never sent.
// 2. A row is claimed (pending or failed to posting) atomically before it is sent, so two clicks
//    or two users cannot send it twice. A row someone else claimed is blocked.
// 3. The run stops after the first batch in which any sent row did not post. The rest stay as
//    they were, so a surprise never spreads across a whole month.
// 4. A request that dies after sending leaves its rows "unknown", never "failed", and they are
//    looked up by Ref no. before any retry.

/**
 * Moves the row to "posting" only if it is still pending or failed, so two clicks or two users
 * cannot send the same row twice. Returns null when someone else got there first.
 */
async function claimRow({
  rowId,
  docNumber,
}: {
  rowId: string;
  docNumber: string;
}): Promise<ImportRow | null> {
  const claimed = await ImportRowModel.findOneAndUpdate(
    { rowId, status: { $in: ["pending", "failed"] } },
    { $set: { status: "posting", docNumber }, $unset: { postMessage: 1 } },
    { new: true },
  ).lean();
  return claimed ? (cleanMongoObject(claimed) as ImportRow) : null;
}

/**
 * Adds the account a row was posted to into the merchant's other accounts, so the next row of
 * that merchant can offer it. Atomic ($addToSet), and it never fails the post: the purchase is
 * already in QuickBooks, so a problem here only means the account is not remembered this time.
 */
async function rememberPostedAccount({
  mapping,
  postedAccountId,
}: {
  mapping: MerchantMapping | null;
  postedAccountId: string;
}): Promise<void> {
  if (!mapping || !shouldRememberAccount({ mapping, postedAccountId })) return;
  try {
    await ImportMerchantMappingModel.updateOne(
      {
        merchantKey: mapping.merchantKey,
        ownerUserName: mapping.ownerUserName,
        // The default can have changed since the mapping was read.
        defaultAccountId: { $ne: postedAccountId },
      },
      { $addToSet: { otherAccountIds: postedAccountId } },
    );
  } catch {
    console.error("[QBO] Posted, but could not remember the account for the merchant.");
  }
}

function describeThrown(error: unknown): { type: string; statusCode: number; message: string } {
  const appError = error instanceof AppError ? error : null;
  return {
    type: appError?.type ?? "UNKNOWN_ERROR",
    statusCode: appError?.statusCode ?? 500,
    message: appError?.message ?? "The request to QuickBooks failed unexpectedly.",
  };
}

/** Sends one batch of claimed rows and returns what each row's answer means. */
async function sendBatch(claimedRows: ReadyRow[]): Promise<Map<string, PostDecision>> {
  const rowIds = claimedRows.map((ready) => ready.row.rowId);
  try {
    const response = await qboApi<QboBatchResponse<{ Purchase: QboPurchase }>>({
      path: "/batch",
      method: "POST",
      pathTemplate: "/batch",
      timeoutMs: qboConst.batchRequestTimeoutMs,
      body: {
        BatchItemRequest: buildBatchItems({
          entries: claimedRows.map((ready) => ({
            rowId: ready.row.rowId,
            purchase: ready.purchase,
          })),
        }),
      },
    });
    return decisionsFromResponse({ response, rowIds });
  } catch (error) {
    return decisionsFromThrown({ rowIds, thrown: describeThrown(error) });
  }
}

/** Claims each row of a batch. A row someone else took is left out of the request and reported as blocked. */
async function claimBatch({
  batch,
  blockedRows,
}: {
  batch: ReadyRow[];
  blockedRows: PostRowsResult["blockedRows"];
}): Promise<ReadyRow[]> {
  const claimed: ReadyRow[] = [];
  for (const ready of batch) {
    const claim = await claimRow({
      rowId: ready.row.rowId,
      docNumber: ready.purchase.DocNumber ?? "",
    });
    if (claim) {
      claimed.push({ ...ready, row: claim });
    } else {
      blockedRows.push(
        toBlockedRow({ row: ready.row, problems: ["Someone else is already posting this row."] }),
      );
    }
  }
  return claimed;
}

/**
 * Posts the requested rows. See the rules at the top of this file. Everything that was not sent
 * is reported with a reason, so the caller can show exactly what happened to every row asked for.
 */
export async function postRows({
  rowIds,
  postedByUserName,
}: {
  rowIds: string[];
  postedByUserName: string;
}): Promise<PostRowsResult> {
  const uniqueRowIds = [...new Set(rowIds)];
  if (uniqueRowIds.length === 0) throw validationError("Choose at least one row to post.");
  if (uniqueRowIds.length > MAX_ROWS_PER_REQUEST) {
    throw validationError(
      `At most ${MAX_ROWS_PER_REQUEST} rows can be posted in one go. Post the rest afterwards.`,
    );
  }

  const rows = await loadRowsById(uniqueRowIds);
  const context = await loadPostContext();
  const { readyRows, blockedRows } = planPostRows({
    rowIds: uniqueRowIds,
    rowMap: new Map(rows.map((row) => [row.rowId, row])),
    context,
  });

  const batches = chunkItems({ items: readyRows, size: ROWS_PER_BATCH });
  const results: PostResult[] = [];
  let stopReason: string | null = null;
  let sentBatchCount = batches.length;

  for (const [batchIndex, batch] of batches.entries()) {
    const claimed = await claimBatch({ batch, blockedRows });
    if (claimed.length === 0) continue;

    const decisions = await sendBatch(claimed);
    const batchOutcomes: PostOutcome[] = [];
    for (const ready of claimed) {
      const decision = decisions.get(ready.row.rowId)!;
      const saved = await recordDecision({ rowId: ready.row.rowId, decision, postedByUserName });
      if (decision.outcome === "posted") {
        await rememberPostedAccount({
          mapping: ready.mapping,
          postedAccountId: ready.expenseAccountId,
        });
      }
      results.push({ row: saved, outcome: decision.outcome });
      batchOutcomes.push(decision.outcome);
    }

    if (shouldStopAfter(batchOutcomes)) {
      sentBatchCount = batchIndex + 1;
      stopReason = describeStop({
        batchNumber: batchIndex + 1,
        batchCount: batches.length,
        outcomes: batchOutcomes,
        notAttemptedCount: batches.slice(sentBatchCount).flat().length,
      });
      break;
    }
  }

  const notAttemptedRowIds = batches
    .slice(sentBatchCount)
    .flat()
    .map((ready) => ready.row.rowId);
  return { results, blockedRows, notAttemptedRowIds, stopReason };
}