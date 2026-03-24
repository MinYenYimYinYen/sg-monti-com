import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { getProductMasters } from "@/app/realGreen/customer/selectors/hydrateProductsPlanned";
import {
  baseLoadout,
  Loadout,
  LoadoutMaster,
  LoadoutSubProduct,
  LoadoutMixedProduct,
} from "@/app/realGreen/product/_lib/types/LoadoutTypes";
import {
  SubProductConfig,
  ProductMaster,
} from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

export function hydrateLoadout(params: {
  servDoc: ServiceDoc;
  servCodeMap: Map<string, ServCode>;
}): Loadout {
  const { servDoc, servCodeMap } = params;

  const servCode = servCodeMap.get(servDoc.servCodeId);
  if (!servCode) return baseLoadout;

  const productMasters = getProductMasters(servCode, servDoc.size);

  const masters = productMasters.map((master) =>
    hydrateMaster({
      master,
      size: servDoc.size,
    }),
  );

  return { masters };
}

function hydrateMaster(params: {
  master: ProductMaster;
  size: number;
}): LoadoutMaster {
  const { master, size } = params;

  const childProductIds = buildChildProductIdSet(master.subProductConfigs);

  const subProducts = master.subProductConfigs
    .filter((subConfig) => !childProductIds.has(subConfig.subId))
    .map((subConfig) =>
      hydrateSubProduct({
        subConfig,
        allSubConfigs: master.subProductConfigs,
        size,
      }),
    )
    .filter((sub): sub is LoadoutSubProduct => sub !== null);

  return {
    product: master,
    plannedAmount: size,
    startAmount: null,
    finishAmount: null,
    unit: master.unit,
    subProducts,
  };
}

function hydrateSubProduct(params: {
  subConfig: SubProductConfig;
  allSubConfigs: SubProductConfig[];
  size: number;
}): LoadoutSubProduct | null {
  const { subConfig, allSubConfigs, size } = params;

  if (!subConfig.subProduct) return null;

  const mixedProducts = subConfig.mixedProductIds
    .map((mixedId) =>
      hydrateMixedProduct({
        mixedId,
        allSubConfigs,
        size,
        appMethodId: subConfig.appMethodId,
      }),
    )
    .filter((mixed): mixed is LoadoutMixedProduct => mixed !== null);

  return {
    config: subConfig,
    product: subConfig.subProduct,
    plannedAmount: size * subConfig.rate,
    startAmount: null,
    finishAmount: null,
    unit: subConfig.subProduct.unit,
    mixedProducts,
  };
}

function hydrateMixedProduct(params: {
  mixedId: number;
  allSubConfigs: SubProductConfig[];
  size: number;
  appMethodId: string | null;
}): LoadoutMixedProduct | null {
  const { mixedId, allSubConfigs, size } = params;

  const mixedConfig = allSubConfigs.find((c) => c.subId === mixedId);
  if (!mixedConfig || !mixedConfig.subProduct) return null;

  return {
    product: mixedConfig.subProduct,
    plannedAmount: size * mixedConfig.rate,
    startAmount: null,
    finishAmount: null,
    unit: mixedConfig.subProduct.unit,
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
