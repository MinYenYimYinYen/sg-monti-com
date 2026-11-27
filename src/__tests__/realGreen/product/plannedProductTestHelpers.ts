import { PlannedProductMasterDoc } from "@/app/realGreen/product/_lib/selectors/getPlannedProducts";
import { ProductRuleDoc } from "@/app/realGreen/progServ/_lib/types/ProductRule";

// Inputs for getPlannedProducts tests. Each test states its own sizes and rates; only the
// plumbing is shared. Use sizes and rates whose product is exact in floating point.

export const SERV_ID = 501;

type SubSpec = { subId: number; storedRate: number };

export function masterMap(
  masters: [masterId: number, subs: SubSpec[]][],
): Map<number, PlannedProductMasterDoc> {
  return new Map(
    masters.map(([masterId, subs]) => [masterId, { subProductConfigDocs: subs }]),
  );
}

export function rule(
  sizeOperator: ProductRuleDoc["sizeOperator"],
  size: number,
  productMasterIds: number[],
): ProductRuleDoc {
  return { sizeOperator, size, productMasterIds };
}
