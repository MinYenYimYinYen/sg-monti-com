import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { getProductMasters } from "@/app/realGreen/customer/selectors/hydrateProductsPlanned";
import { LoadoutInventory } from "@/app/realGreen/product/_lib/types/LoadoutTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

export function hydrateLoadoutInventory(params: {
  servDoc: ServiceDoc;
  servCodeMap: Map<string, ServCode>;
}): LoadoutInventory {
  const { servDoc, servCodeMap } = params;

  const servCode = servCodeMap.get(servDoc.servCodeId);
  if (!servCode) return { masters: [] };

  const productMasters = getProductMasters(servCode, servDoc.size);

  const masters = productMasters.map((master) =>
    hydrateMasterInventory({
      master,
      size: servDoc.size,
    }),
  );

  return { masters };
}

function hydrateMasterInventory(params: {
  master: ProductMaster;
  size: number;
}): LoadoutInventory["masters"][number] {
  const { master, size } = params;

  // Group sub-products by appMethod
  const appMethodMap = new Map<
    string,
    LoadoutInventory["masters"][number]["appMethods"][number]
  >();

  const nonAppMethodSubs: LoadoutInventory["masters"][number]["subProducts"] =
    [];
  const singles: LoadoutInventory["masters"][number]["singles"] = [];

  master.subProductConfigs.forEach((subConfig) => {
    if (!subConfig.subProduct) return;

    const subInventoryItem = {
      product: subConfig.subProduct,
      plannedAmount: size * subConfig.rate,
      startAmount: null,
      finishAmount: null,
      unit: subConfig.subProduct.unit,
    };

    // If this sub uses an appMethod and has mixed products
    if (subConfig.useAppMethod && subConfig.mixedProductIds.length > 0) {
      const appMethodId = subConfig.appMethodId || "unknown";

      if (!appMethodMap.has(appMethodId)) {
        appMethodMap.set(appMethodId, {
          appMethod: subConfig.appMethod!,
          subProducts: [],
        });
      }

      appMethodMap.get(appMethodId)!.subProducts.push(subInventoryItem);
    }
    // If this sub uses appMethod but has NO mixed products (it's the carrier/water)
    else if (subConfig.useAppMethod && subConfig.mixedProductIds.length === 0) {
      // This is the appMethod container itself - skip it from inventory
      // (the appMethod tracks the water, not the individual sub-product)
    }
    // Non-appMethod sub-products
    else {
      nonAppMethodSubs.push(subInventoryItem);
    }
  });

  return {
    product: master,
    plannedAmount: size,
    startAmount: null,
    finishAmount: null,
    unit: master.unit,
    appMethods: Array.from(appMethodMap.values()),
    subProducts: nonAppMethodSubs,
    singles: singles, // Empty for now - can be populated manually by techs
  };
}
