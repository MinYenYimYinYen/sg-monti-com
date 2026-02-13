import {
  Production,
  ProductionCore,
} from "@/app/realGreen/_lib/subTypes/Production";
import { ProductCommonDoc } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { baseProductCommon } from "@/app/realGreen/product/_lib/baseProduct";

export function hydrateProduction(
  productionCore: ProductionCore | null,
  productDocMap: Map<number, ProductCommonDoc>,
): Production | null {
  if (!productionCore) return null;
  const usedAppProducts: AppProduct[] = productionCore.usedAppProductCores.map(
    (appProductCore) => {
      const appProduct: AppProduct = {
        ...appProductCore,
        productCommon:
          productDocMap.get(appProductCore.productId) || baseProductCommon,
      };
      return appProduct;
    },
  );

  const production: Production = {
    ...productionCore,
    usedAppProducts,
  };
  return production;
}
