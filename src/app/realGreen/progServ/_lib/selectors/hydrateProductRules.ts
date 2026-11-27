import { ProductRule, ProductRuleDoc } from "../types/ProductRule";
import { AppError } from "@/lib/errors/AppError";

export function hydrateProductRules(
  productRuleDocs: ProductRuleDoc[],
): ProductRule[] {
  return productRuleDocs.map((rule) => {
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

    return { ...rule, desc };
  });
}
