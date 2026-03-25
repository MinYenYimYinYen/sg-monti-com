import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { getProductMasters } from "@/app/realGreen/customer/selectors/hydrateProductsPlanned";
import {
  LoadoutBase,
} from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export function hydrateLoadoutInventory(params: {
  servDoc: ServiceDoc;
  servCodeMap: Map<string, ServCode>;
}): LoadoutBase {
  const { servDoc, servCodeMap } = params;

  const servCode = servCodeMap.get(servDoc.servCodeId);
  if (!servCode)
    return {
      masters: [], singles: [], subProducts: [],
    };

  const productMasters = getProductMasters(servCode, servDoc.size);

  const masters = productMasters.map((master) =>
    hydrateMasterInventory({
      master,
      size: servDoc.size,
    }),
  );

  return {  masters, singles: [], subProducts: [] };
}

function hydrateMasterInventory(params: {
  master: ProductMaster;
  size: number;
}): LoadoutBase["masters"][number] {
  const { master, size } = params;

  // Group sub-products by appMethod
  const appMethodMap = new Map<
    string,
    LoadoutBase["masters"][number]["appMethods"][number]
  >();

  // Track which product IDs are claimed by appMethods
  const claimedProductIds = new Set<number>();

  const nonAppMethodSubs: LoadoutBase["masters"][number]["subProducts"] =
    [];

  // First pass: identify appMethod containers and their claimed products
  master.subProductConfigs.forEach((subConfig) => {
    if (!subConfig.subProduct) return;

    // If this sub has mixed products, it's an appMethod container
    if (subConfig.mixedProductIds.length > 0) {
      const appMethodId = subConfig.appMethodId || baseStrId;

      if (!appMethodMap.has(appMethodId)) {
        // Create mixProduct with appMethodId as description and productCode
        const mixProduct: ProductSub = {
          ...subConfig.subProduct,
          description: appMethodId,
          productCode: appMethodId,
        };

        appMethodMap.set(appMethodId, {
          appMethodId: subConfig.appMethodId!,
          appMethod: subConfig.appMethod!,
          mixProductId: mixProduct.productId,
          mixProduct: mixProduct,
          mixProductUnitId: mixProduct.unit.unitId,
          mixProductUnit: mixProduct.unit,
          plannedAmount: size * subConfig.rate,
          startAmount: null,
          finishAmount: null,
          subProducts: [],
        });
      }

      // Mark the mixed products as claimed
      subConfig.mixedProductIds.forEach((id) => claimedProductIds.add(id));
    }
  });

  // Second pass: distribute sub-products to their correct locations
  master.subProductConfigs.forEach((subConfig) => {
    if (!subConfig.subProduct) return;

    const subInventoryItem = {
      productId: subConfig.subProduct.productId,
      product: subConfig.subProduct,
      plannedAmount: size * subConfig.rate,
      startAmount: null,
      finishAmount: null,
      unitId: subConfig.subProduct.unit.unitId,
      unit: subConfig.subProduct.unit,
    };

    // Skip the appMethod container itself (it's stored as mixProduct)
    if (subConfig.mixedProductIds.length > 0) {
      return;
    }

    // If this product is claimed by an appMethod, add it to that appMethod's subProducts
    if (claimedProductIds.has(subConfig.subProduct.productId)) {
      // Find which appMethod claims this product
      for (const subConfigWithAppMethod of master.subProductConfigs) {
        if (
          subConfigWithAppMethod.mixedProductIds.includes(
            subConfig.subProduct.productId,
          )
        ) {
          const appMethodId = subConfigWithAppMethod.appMethodId || baseStrId;
          appMethodMap.get(appMethodId)?.subProducts.push(subInventoryItem);
          break;
        }
      }
    }
    // Otherwise, add to regular subProducts
    else {
      nonAppMethodSubs.push(subInventoryItem);
    }
  });

  return {
    productId: master.productId,
    product: master,
    plannedAmount: size,
    startAmount: null,
    finishAmount: null,
    unitId: master.unit.unitId,
    unit: master.unit,
    appMethods: Array.from(appMethodMap.values()),
    subProducts: nonAppMethodSubs,
  };
}
