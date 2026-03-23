import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { getProductMasters } from "@/app/realGreen/customer/selectors/hydrateProductsPlanned";
import {
  baseLoadout,
  Loadout,
} from "@/app/realGreen/product/_lib/types/LoadoutTypes";
import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";

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
    .map((master) => {
      const masterProductCommon = productCommonMap.get(master.productId);
      if (!masterProductCommon) return null;

      // Build a Set of all subIds that are mixed into other products (children)
      const mixedSubIds = new Set<number>();
      master.subProductConfigs.forEach((config) => {
        config.mixedProductIds.forEach((mixedId) => {
          mixedSubIds.add(mixedId);
        });
      });

      // Only process subProducts that aren't children (not in mixedSubIds)
      const subProducts = master.subProductConfigs
        .filter((subConfig) => !mixedSubIds.has(subConfig.subId))
        .map((subConfig) => {
          const subProductCommon = productCommonMap.get(subConfig.subId);
          if (!subProductCommon) return null;

          // Build mixedProducts array from mixedProductIds
          const mixedProducts = subConfig.mixedProductIds
            .map((mixedId) => {
              const mixedConfig = master.subProductConfigs.find(
                (c) => c.subId === mixedId,
              );
              if (!mixedConfig) return null;

              const mixedProductCommon = productCommonMap.get(mixedId);
              if (!mixedProductCommon) return null;

              return {
                product: mixedProductCommon,
                amount: servDoc.size * mixedConfig.rate,
                unit: mixedProductCommon.unit,
              };
            })
            .filter(
              (
                mixed,
              ): mixed is {
                product: ProductCommon;
                amount: number;
                unit: UnitCRM;
              } => mixed !== null,
            );

          return {
            product: subProductCommon,
            amount: servDoc.size * subConfig.rate,
            unit: subProductCommon.unit,
            mixedProducts,
          };
        })
        .filter(
          (
            sub,
          ): sub is {
            product: ProductCommon;
            amount: number;
            unit: UnitCRM;
            mixedProducts: {
              product: ProductCommon;
              amount: number;
              unit: UnitCRM;
            }[];
          } => sub !== null,
        );

      return {
        product: masterProductCommon,
        amount: servDoc.size,
        unit: masterProductCommon.unit,
        subProducts,
      };
    })
    .filter(
      (
        master,
      ): master is {
        product: ProductCommon;
        amount: number;
        unit: UnitCRM;
        subProducts: {
          product: ProductCommon;
          amount: number;
          unit: UnitCRM;
          mixedProducts: {
            product: ProductCommon;
            amount: number;
            unit: UnitCRM;
          }[];
        }[];
      } => master !== null,
    );

  return { masters };
}
