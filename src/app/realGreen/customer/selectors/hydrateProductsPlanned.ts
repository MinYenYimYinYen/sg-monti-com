import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import {
  baseProductCommon,
  baseProductCommonDoc,
} from "@/app/realGreen/product/_lib/baseProduct";

export function getProductMasters(servCode: ServCode, size: number) {
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
  if (productRules.length === 0) return [];

  return productRules.flatMap((rule) => rule.productMasters);
}

export function hydrateProductsPlanned(
  servDoc: ServiceDoc,
  servCodeMap: Map<string, ServCode>,
  productCommonMap: Map<number, ProductCommon>,
): AppProduct[] {
  const { size, servCodeId } = servDoc;
  const servCode = servCodeMap.get(servCodeId);
  if (!servCode) return [];

  const productMasters = getProductMasters(servCode, size);
  const subConfigs = productMasters.flatMap(
    (master) => master.subProductConfigs,
  );

  const appProducts: AppProduct[] = subConfigs.map((subConfig) => {
    return {
      productId: subConfig.subId,
      amount: size * subConfig.rate,
      size,
      servId: servDoc.servId,
      productCommon:
        productCommonMap.get(subConfig.subId) || baseProductCommon,
    };
  });
  return appProducts;
}
