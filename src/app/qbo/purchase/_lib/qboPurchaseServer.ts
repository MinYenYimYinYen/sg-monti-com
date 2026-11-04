import { AppError } from "@/lib/errors/AppError";
import { qboQueryAll } from "@/app/qbo/_lib/api/qboQuery";
import { qboConst } from "@/app/qbo/_lib/qboConst";
import {
  QboPurchase,
  QboPurchaseRange,
  QboPurchaseSummary,
} from "@/app/qbo/purchase/types/QboPurchaseTypes";
import {
  buildPurchaseWhere,
  sortPurchasesNewestFirst,
  summarizePurchase,
  validatePurchaseRange,
} from "@/app/qbo/purchase/_lib/qboPurchaseUtils";

// Server only. Read-only. Purchases are loaded for a date range, never all at once: a company
// can hold years of them. Each purchase is cut down before it leaves the server.
export async function loadQboPurchases(range: QboPurchaseRange): Promise<QboPurchaseSummary[]> {
  // The dates go into the query text, so they are checked here and not only in the browser.
  const problem = validatePurchaseRange({ range, maxDays: qboConst.purchaseMaxRangeDays });
  if (problem) {
    throw new AppError({
      message: problem,
      type: "VALIDATION_ERROR",
      statusCode: 400,
      isOperational: true,
    });
  }

  const purchases = await qboQueryAll<QboPurchase>({
    entity: "Purchase",
    where: buildPurchaseWhere(range),
  });
  return sortPurchasesNewestFirst(purchases.map(summarizePurchase));
}
