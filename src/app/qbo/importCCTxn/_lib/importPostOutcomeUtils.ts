import { QboBatchResponse, QboFault } from "@/app/qbo/_lib/types/QboCommonTypes";
import { QboPurchase } from "@/app/qbo/purchase/types/QboPurchaseTypes";
import { describeFault } from "@/app/qbo/_lib/api/qboHttpUtils";
import { ImportRow, PostOutcome } from "@/app/qbo/importCCTxn/types/ImportRowTypes";

// Pure rules for what a posting attempt means for a row. The danger is a wrong "failed": a row
// marked failed gets posted again, and a purchase that did land would be entered twice. So
// anything not certain is "unknown", and unknown rows are reconciled before any retry.

export type PostDecision = {
  outcome: PostOutcome;
  purchaseId: string | null;
  message: string;
};

// Errors that would hit every row the same way, so the row goes back to pending untouched
// (account period closed, subscription problem, authorization failure).
const STOP_BATCH_CODES = new Set(["6210", "6190", "120"]);

export function decideFromFault(fault: QboFault): PostDecision {
  const errors = fault.Error ?? [];
  const detail = describeFault({ errors }) ?? "QuickBooks rejected the purchase.";
  const codes = errors.map((error) => error.code).join(", ");
  const text = codes ? `${detail} (code ${codes})` : detail;

  if (errors.some((error) => STOP_BATCH_CODES.has(String(error.code)))) {
    return {
      outcome: "pending",
      purchaseId: null,
      message: `${text}. Nothing was posted. Fix this before trying again.`,
    };
  }
  return { outcome: "failed", purchaseId: null, message: text };
}

/**
 * A created item carries the Purchase with its Id (verified by the first live write). Anything
 * unexpected is "unknown", never "posted", so the row is reconciled before any retry.
 */
export function readBatchOutcome({
  response,
  bId,
}: {
  response: QboBatchResponse<{ Purchase: QboPurchase }>;
  bId: string;
}): PostDecision {
  const item = response.BatchItemResponse?.find((candidate) => candidate.bId === bId);
  if (!item) {
    return {
      outcome: "unknown",
      purchaseId: null,
      message: "QuickBooks did not answer for this row. Check QuickBooks before posting again.",
    };
  }
  if (item.Fault) return decideFromFault(item.Fault);

  const purchaseId = item.Purchase?.Id;
  if (purchaseId) {
    return { outcome: "posted", purchaseId, message: "Posted to QuickBooks." };
  }

  const keys = Object.keys(item).filter((key) => key !== "bId");
  return {
    outcome: "unknown",
    purchaseId: null,
    message: `QuickBooks answered with an unexpected shape (keys: ${keys.join(", ") || "none"}). Check QuickBooks before posting again.`,
  };
}

/**
 * A request that never reached QuickBooks, or that it rejected whole with a client error, did
 * not create anything. A network failure or a server error may have happened after the purchase
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
}): PostDecision {
  if (type === "NETWORK_ERROR" || statusCode >= 500) {
    return {
      outcome: "unknown",
      purchaseId: null,
      message: `${message} The purchase may or may not have been created. Check QuickBooks before posting again.`,
    };
  }
  return { outcome: "failed", purchaseId: null, message };
}

/** What a lookup of the row's Ref no. says about whether it was posted. */
export function interpretReconcile({
  row,
  purchases,
}: {
  row: Pick<ImportRow, "transactionDate" | "amountCents">;
  purchases: QboPurchase[];
}): PostDecision {
  if (purchases.length === 0) {
    return {
      outcome: "pending",
      purchaseId: null,
      message: "Not found in QuickBooks, so it is safe to post again.",
    };
  }
  if (purchases.length > 1) {
    return {
      outcome: "unknown",
      purchaseId: null,
      message: `${purchases.length} purchases in QuickBooks carry this Ref no. Resolve it in QuickBooks.`,
    };
  }

  const [purchase] = purchases;
  const sameAmount =
    purchase.TotalAmt !== undefined && Math.round(purchase.TotalAmt * 100) === row.amountCents;
  if (purchase.TxnDate !== row.transactionDate || !sameAmount) {
    return {
      outcome: "unknown",
      purchaseId: null,
      message:
        "A purchase with this Ref no. exists, but its date or amount differs. Check it in QuickBooks.",
    };
  }
  return {
    outcome: "posted",
    purchaseId: purchase.Id,
    message: "Found in QuickBooks by its Ref no.",
  };
}
