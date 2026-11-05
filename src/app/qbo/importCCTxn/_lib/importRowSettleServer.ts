import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { ImportRowModel } from "@/app/qbo/importCCTxn/models/ImportRowModel";
import { PostDecision } from "@/app/qbo/importCCTxn/_lib/importPostOutcomeUtils";

// Server only. Writes a decision onto a row in our own database. It does not talk to QuickBooks.

/** Stores what a posting attempt or a lookup concluded. A posted row also keeps its QuickBooks Id. */
export async function recordDecision({
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
