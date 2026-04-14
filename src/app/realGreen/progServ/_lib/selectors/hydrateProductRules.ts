import { ProductRule, ProductRuleDoc } from "../types/ProductRule";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { AppError } from "@/lib/errors/AppError";

export function hydrateProductRules(
  productRuleDocs: ProductRuleDoc[],
  productMasterMap: Map<number, ProductMaster>,
): ProductRule[] {
  return productRuleDocs.map((rule) => {
    const productMasters = rule.productMasterIds
      .map((id) => productMasterMap.get(id))
      .filter((m): m is ProductMaster => m !== undefined);

    let desc: string;
    switch (rule.sizeOperator) {
      case "all": {
        desc = "All";
        break;
      }
      case "gt": {
        desc = `GT ${rule.size}`;
        break;
      }
      case "lte": {
        desc = `LTE ${rule.size}`;
        break;
      }
      default: {
        throw new AppError({
          message: `Missing desc for ${rule.sizeOperator}`,
          type: "VALIDATION_ERROR",
        });
      }
    }

    return { ...rule, productMasters, desc };
  });
}
