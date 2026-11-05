import { qboQueryAll } from "@/app/qbo/_lib/api/qboQuery";
import { QboPurchase } from "@/app/qbo/purchase/types/QboPurchaseTypes";
import { buildDocNumberWhere } from "@/app/qbo/purchase/_lib/qboPurchaseUtils";
import { ImportRowModel } from "@/app/qbo/importCCTxn/models/ImportRowModel";
import { PostResult } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { interpretReconcile } from "@/app/qbo/importCCTxn/_lib/importPostOutcomeUtils";
import { isReconcilable } from "@/app/qbo/importCCTxn/_lib/importBatchPlanUtils";
import { recordDecision } from "@/app/qbo/importCCTxn/_lib/importRowSettleServer";
import { loadRow, validationError } from "@/app/qbo/importCCTxn/_lib/importPostLookupServer";

// Server only. Reads QuickBooks and our own rows. It never posts anything.

/** When the row last changed, which tells a row stuck in "posting" from one still in flight. */
async function readUpdatedAtMs(rowId: string): Promise<number | null> {
  const timing = (await ImportRowModel.findOne({ rowId }).select("updatedAt").lean()) as {
    updatedAt?: Date | string;
  } | null;
  return timing?.updatedAt ? new Date(timing.updatedAt).getTime() : null;
}

/**
 * Finds an unsettled row in QuickBooks by its Ref no. and settles it. An unknown row can always be
 * looked up. A row in "posting" only after it has been stuck for a while, because a young one may
 * still be on its way to QuickBooks in another request.
 */
export async function reconcileRow({
  rowId,
  postedByUserName,
}: {
  rowId: string;
  postedByUserName: string;
}): Promise<PostResult> {
  const row = await loadRow(rowId);
  const updatedAtMs = await readUpdatedAtMs(rowId);

  if (!isReconcilable({ status: row.status, updatedAtMs, nowMs: Date.now() })) {
    throw validationError(
      row.status === "posting"
        ? "This row was sent a moment ago. If it still shows as posting after 10 minutes, look it up then."
        : "Only unknown rows need reconciling.",
    );
  }
  if (!row.docNumber) throw validationError("This row has no Ref no. to look up.");

  const purchases = await qboQueryAll<QboPurchase>({
    entity: "Purchase",
    where: buildDocNumberWhere(row.docNumber),
  });
  const decision = interpretReconcile({ row, purchases });
  // "Not found" returns the row to pending, which is the only way an unsettled row can be retried.
  const saved = await recordDecision({ rowId, decision, postedByUserName });
  return { row: saved, outcome: decision.outcome };
}
