import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { AppError } from "@/lib/errors/AppError";
import { qboApi } from "@/app/qbo/_lib/api/qboApi";
import { qboQueryAll } from "@/app/qbo/_lib/api/qboQuery";
import { QboBatchResponse } from "@/app/qbo/_lib/types/QboCommonTypes";
import { QboPurchase } from "@/app/qbo/purchase/types/QboPurchaseTypes";
import { ImportRow, PostResult } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { ImportRowModel } from "@/app/qbo/importCCTxn/models/ImportRowModel";
import { buildPurchaseCreate, checkRowReadyToPost } from "@/app/qbo/importCCTxn/_lib/importPostUtils";
import {
  decideFromThrown,
  interpretReconcile,
  PostDecision,
  readBatchOutcome,
} from "@/app/qbo/importCCTxn/_lib/importPostOutcomeUtils";
import {
  buildCheckInput,
  loadRow,
  validationError,
} from "@/app/qbo/importCCTxn/_lib/importPostLookupServer";
import { buildDocNumberWhere } from "@/app/qbo/purchase/_lib/qboDocNumberInspectUtils";

// Server only. The ONLY code that writes to QuickBooks (POST /batch). Stage 1 of the write phase
// posts one row per request; raise this deliberately, after a small file has been checked.
const MAX_ROWS_PER_POST = 1;

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

async function recordDecision({
  rowId,
  decision,
  postedByUserName,
}: {
  rowId: string;
  decision: PostDecision;
  postedByUserName: string;
}): Promise<ImportRow> {
  const isPosted = decision.outcome === "posted" && decision.purchaseId !== null;
  const saved = await ImportRowModel.findOneAndUpdate(
    { rowId },
    {
      $set: {
        status: decision.outcome,
        postMessage: decision.message,
        ...(isPosted
          ? {
              qboPurchaseId: decision.purchaseId,
              postedAt: new Date().toISOString(),
              postedByUserName,
            }
          : {}),
      },
    },
    { new: true },
  ).lean();
  return cleanMongoObject(saved!) as ImportRow;
}

async function postOneRow({
  rowId,
  postedByUserName,
}: {
  rowId: string;
  postedByUserName: string;
}): Promise<PostResult> {
  const row = await loadRow(rowId);
  const input = await buildCheckInput(row);
  const check = checkRowReadyToPost(input);
  if (check.problems.length > 0 || !input.vendor || !input.expenseAccount || !input.cardAccount) {
    throw validationError(check.problems.join(" "));
  }

  const purchase = buildPurchaseCreate({
    row,
    vendor: input.vendor,
    expenseAccount: input.expenseAccount,
    cardAccount: input.cardAccount,
  });
  const claimed = await claimRow({ rowId, docNumber: purchase.DocNumber ?? "" });
  if (!claimed) throw validationError("Someone else is already posting this row.");

  let decision: PostDecision;
  try {
    const response = await qboApi<QboBatchResponse<{ Purchase: QboPurchase }>>({
      path: "/batch",
      method: "POST",
      pathTemplate: "/batch",
      body: { BatchItemRequest: [{ bId: rowId, operation: "create", Purchase: purchase }] },
    });
    decision = readBatchOutcome({ response, bId: rowId });
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    decision = decideFromThrown({
      type: appError?.type ?? "UNKNOWN_ERROR",
      statusCode: appError?.statusCode ?? 500,
      message: appError?.message ?? "The request to QuickBooks failed unexpectedly.",
    });
  }

  const saved = await recordDecision({ rowId, decision, postedByUserName });
  return { row: saved, outcome: decision.outcome };
}

export async function postRows({
  rowIds,
  postedByUserName,
}: {
  rowIds: string[];
  postedByUserName: string;
}): Promise<PostResult[]> {
  if (rowIds.length === 0) throw validationError("Choose a row to post.");
  if (rowIds.length > MAX_ROWS_PER_POST) {
    throw validationError(`Only ${MAX_ROWS_PER_POST} row can be posted at a time for now.`);
  }

  const results: PostResult[] = [];
  for (const rowId of rowIds) {
    results.push(await postOneRow({ rowId, postedByUserName }));
  }
  return results;
}

/** Finds an unknown row in QuickBooks by its Ref no. and settles it. Never posts anything. */
export async function reconcileRow({
  rowId,
  postedByUserName,
}: {
  rowId: string;
  postedByUserName: string;
}): Promise<PostResult> {
  const row = await loadRow(rowId);
  if (row.status !== "unknown") throw validationError("Only unknown rows need reconciling.");
  if (!row.docNumber) throw validationError("This row has no Ref no. to look up.");

  const purchases = await qboQueryAll<QboPurchase>({
    entity: "Purchase",
    where: buildDocNumberWhere(row.docNumber),
  });
  const decision = interpretReconcile({ row, purchases });
  // "Not found" returns the row to pending, which is the only way an unknown row can be retried.
  const saved = await recordDecision({ rowId, decision, postedByUserName });
  return { row: saved, outcome: decision.outcome };
}
