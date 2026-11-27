import { ProductRuleDoc } from "@/app/realGreen/progServ/_lib/types/ProductRule";
import { SubProductConfigDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { PlannedProduct } from "@/app/realGreen/product/_lib/types/PlannedProduct";

/** The part of a master doc this function reads. */
export type PlannedProductMasterDoc = {
  subProductConfigDocs: Pick<SubProductConfigDoc, "subId" | "storedRate">[];
};

type GetPlannedProductsParams = {
  servId: number;
  size: number;
  productRuleDocs: ProductRuleDoc[];
  productMasterDocMap: ReadonlyMap<number, PlannedProductMasterDoc>;
};

function ruleMatchesSize({
  rule,
  size,
}: {
  rule: ProductRuleDoc;
  size: number;
}): boolean {
  switch (rule.sizeOperator) {
    case "all":
      return true;
    case "lte":
      return size <= rule.size;
    case "gt":
      return size > rule.size;
  }
}

// Every sub-product on a matching master counts once, at size * storedRate. The old counting by
// equipment package is gone on purpose (decision in 05), and so is the water row.
export function getPlannedProducts({
  servId,
  size,
  productRuleDocs,
  productMasterDocMap,
}: GetPlannedProductsParams): PlannedProduct[] {
  return productRuleDocs
    .filter((rule) => ruleMatchesSize({ rule, size }))
    .flatMap((rule) => rule.productMasterIds)
    .flatMap((masterId) => {
      const masterDoc = productMasterDocMap.get(masterId);
      if (!masterDoc) return [];
      return masterDoc.subProductConfigDocs.map((config) => ({
        productId: config.subId,
        servId,
        amount: size * config.storedRate,
        treated: size,
      }));
    });
}
