import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { baseProductCommonDoc } from "@/app/realGreen/product/_lib/baseProduct";

export function hydrateProductsPlanned(
  servDoc: ServiceDoc,
  servCodeMap: Map<string, ServCode>,
  productMastersMap: Map<number, ProductMaster>,
  productSinglesMap: Map<number, ProductSingle>,
  productCommonDocMap: Map<number, ProductCommon>,
): AppProduct[] {
  const { size, servCodeId } = servDoc;
  const servCode = servCodeMap.get(servCodeId);
  if (!servCode) return [];

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

  const productMasters = productRules.flatMap((rule) => rule.productMasters);
  const subConfigs = productMasters.flatMap((master) => master.subProductConfigs);

  const appProducts: AppProduct[] = subConfigs.map((subConfig) => {
    return {

      productCommon: productCommonDocMap.get(subConfig.subId) || baseProductCommonDoc,
      // todo: need to fix AppProductCore definition to include ProductCommonDoc,
    }
  })



  //todo: placeHolder
  return [];
}
