import { AppError } from "@/lib/errors/AppError";
import { qboQueryAll } from "@/app/qbo/_lib/api/qboQuery";
import { QboPurchase } from "@/app/qbo/purchase/types/QboPurchaseTypes";
import {
  buildDocNumberWhere,
  describeDocNumberMatch,
  QboDocNumberInspection,
  validateDocNumberForQuery,
} from "@/app/qbo/purchase/_lib/qboDocNumberInspectUtils";

// Server only. A read-only diagnostic for the DocNumber (Ref no.) design: can purchases be found
// by Ref no., and what does QuickBooks hold in CustomField. It stores nothing and writes nothing.
export async function inspectDocNumber({
  docNumber,
}: {
  docNumber: string;
}): Promise<QboDocNumberInspection> {
  const problem = validateDocNumberForQuery(docNumber);
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
    where: buildDocNumberWhere(docNumber),
  });
  return {
    docNumber,
    matchCount: purchases.length,
    matches: purchases.map(describeDocNumberMatch),
  };
}
