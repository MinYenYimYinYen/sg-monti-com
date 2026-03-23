import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { getProductMasters } from "@/app/realGreen/customer/selectors/hydrateProductsPlanned";
import {
  baseLoadout,
  Loadout,
  LoadoutMaster,
  LoadoutSubProduct,
  LoadoutMixedProduct,
} from "@/app/realGreen/product/_lib/types/LoadoutTypes";
import { SubProductConfig } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

export function hydrateLoadout(params: {
  servDoc: ServiceDoc;
  servCodeMap: Map<string, ServCode>;
  productCommonMap: Map<number, ProductCommon>;
}): Loadout {
  const { servDoc, servCodeMap, productCommonMap } = params;

  const servCode = servCodeMap.get(servDoc.servCodeId);
  if (!servCode) return baseLoadout;

  const productMasters = getProductMasters(servCode, servDoc.size);

  const masters = productMasters
    .map((master) =>
      hydrateMaster({
        master,
        productCommonMap,
        size: servDoc.size,
      }),
    )
    .filter((master): master is LoadoutMaster => master !== null);

  return { masters };
}

function hydrateMaster(params: {
  master: { productId: number; subProductConfigs: SubProductConfig[] };
  productCommonMap: Map<number, ProductCommon>;
  size: number;
}): LoadoutMaster | null {
  const { master, productCommonMap, size } = params;

  const masterProductCommon = productCommonMap.get(master.productId);
  if (!masterProductCommon) return null;

  const childProductIds = buildChildProductIdSet(master.subProductConfigs);

  const subProducts = master.subProductConfigs
    .filter((subConfig) => !childProductIds.has(subConfig.subId))
    .map((subConfig) =>
      hydrateSubProduct({
        subConfig,
        allSubConfigs: master.subProductConfigs,
        productCommonMap,
        size,
      }),
    )
    .filter((sub): sub is LoadoutSubProduct => sub !== null);

  return {
    product: masterProductCommon,
    amount: size,
    unit: masterProductCommon.unit,
    subProducts,
  };
}

function hydrateSubProduct(params: {
  subConfig: SubProductConfig;
  allSubConfigs: SubProductConfig[];
  productCommonMap: Map<number, ProductCommon>;
  size: number;
}): LoadoutSubProduct | null {
  const { subConfig, allSubConfigs, productCommonMap, size } = params;

  const subProductCommon = productCommonMap.get(subConfig.subId);
  if (!subProductCommon) return null;

  const mixedProducts = subConfig.mixedProductIds
    .map((mixedId) =>
      hydrateMixedProduct({
        mixedId,
        allSubConfigs,
        productCommonMap,
        size,
      }),
    )
    .filter((mixed): mixed is LoadoutMixedProduct => mixed !== null);

  return {
    product: subProductCommon,
    amount: size * subConfig.rate,
    unit: subProductCommon.unit,
    mixedProducts,
  };
}

function hydrateMixedProduct(params: {
  mixedId: number;
  allSubConfigs: SubProductConfig[];
  productCommonMap: Map<number, ProductCommon>;
  size: number;
}): LoadoutMixedProduct | null {
  const { mixedId, allSubConfigs, productCommonMap, size } = params;

  const mixedConfig = allSubConfigs.find((c) => c.subId === mixedId);
  if (!mixedConfig) return null;

  const mixedProductCommon = productCommonMap.get(mixedId);
  if (!mixedProductCommon) return null;

  return {
    product: mixedProductCommon,
    amount: size * mixedConfig.rate,
    unit: mixedProductCommon.unit,
  };
}

function buildChildProductIdSet(
  subProductConfigs: SubProductConfig[],
): Set<number> {
  const childProductIds = new Set<number>();
  subProductConfigs.forEach((config) => {
    config.mixedProductIds.forEach((mixedId) => {
      childProductIds.add(mixedId);
    });
  });
  return childProductIds;
}
