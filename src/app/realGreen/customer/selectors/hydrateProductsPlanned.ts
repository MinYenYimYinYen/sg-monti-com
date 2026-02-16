import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { baseProductCommonDoc } from "@/app/realGreen/product/_lib/baseProduct";

export function hydrateProductsPlanned(
  servDoc: ServiceDoc,
  servCodeMap: Map<string, ServCode>,
  productCommonDocMap: Map<number, ProductCommon>,
): AppProduct[] {
  const { size, servCodeId } = servDoc;
  const servCode = servCodeMap.get(servCodeId);
  if (!servCode) return [];
  if (!(servDoc.servId === 5962033)) return [];
  // console.log("servCodeId", servCodeId);

  // console.log("productRules", servCode.productRules);
  const productRules = servCode.productRules.filter((rule) => {
    const operator = rule.sizeOperator;
    switch (operator) {
      case "all": {
        return true;
      }
      case "lte": {
        return size <= rule.size;
      }
      case "gt": {
        return size > rule.size;
      }
    }
  });
  // console.log("filtered productRules", productRules);
  if (productRules.length === 0) return [];

  const productMasters = productRules.flatMap((rule) => rule.productMasters);
  // console.log("productMasters", productMasters);
  const subConfigs = productMasters.flatMap(
    (master) => master.subProductConfigs,
  );
  // console.log("subConfigs", subConfigs);

  const appProducts: AppProduct[] = subConfigs.map((subConfig) => {
    return {
      productId: subConfig.subId,
      amount: size * subConfig.rate,
      size,
      servId: servDoc.servId,
      productCommon:
        productCommonDocMap.get(subConfig.subId) || baseProductCommonDoc,
    };
  });
  return appProducts;
}
