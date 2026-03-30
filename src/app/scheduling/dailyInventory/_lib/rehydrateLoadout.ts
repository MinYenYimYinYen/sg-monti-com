import { LoadoutBase, LoadoutDoc } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { Equipment } from "@/app/equipment/EquipmentTypes";
import { AppMethod } from "@/app/appMethod/AppMethodTypes";
import { baseProductMaster, baseProductSub } from "@/app/realGreen/product/_lib/baseProduct";
import { waterProduct, buildWaterUnitConfig, WATER_PRODUCT_ID } from "@/app/equipment/waterProduct";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import { baseAppMethod } from "@/app/appMethod/AppMethodTypes";

/**
 * rehydrateLoadout — inverse of serializeLoadout.
 *
 * Converts a persisted LoadoutDoc (IDs only) back into a full LoadoutBase by
 * re-attaching hydrated product objects, app methods, and unit configs from
 * the provided lookup maps.
 *
 * Water carrier entries (mixProductId === WATER_PRODUCT_ID) are reconstructed
 * using buildWaterUnitConfig(equipment.showFlOz) to restore the correct unit
 * config (Fl Oz app / Gal load for small tanks, Gal / Gal for large tanks).
 */
export function rehydrateLoadout(params: {
  doc: LoadoutDoc;
  productMastersMap: Map<number, ProductMaster>;
  productSubsMap: Map<number, ProductSub>;
  equipmentMap: Map<string, Equipment>;
  appMethodMap: Map<string, AppMethod>;
}): LoadoutBase {
  const { doc, productMastersMap, productSubsMap, equipmentMap, appMethodMap } = params;

  return {
    masters: doc.masters.map((masterDoc) => {
      const masterProduct = productMastersMap.get(masterDoc.productId) ?? baseProductMaster;

      return {
        productId: masterDoc.productId,
        product: masterProduct,
        plannedAmount: masterDoc.plannedAmount,
        startAmount: masterDoc.startAmount,
        finishAmount: masterDoc.finishAmount,
        unitId: masterDoc.unitId,
        unit: masterProduct.unit,
        equipments: masterDoc.equipments.map((eDoc) => {
          const equipment = equipmentMap.get(eDoc.equipmentId);
          const appMethod = equipment
            ? (appMethodMap.get(equipment.defaultAppMethodId) ?? baseAppMethod)
            : (masterProduct.equipmentPackages[0]?.equipments[0]?.appMethod ?? baseAppMethod);

          // Water carrier is a synthetic product not stored in productSubsMap.
          // Reconstruct it using buildWaterUnitConfig(equipment.showFlOz) so the
          // unit config matches what was used when the start loadout was saved.
          const isWaterProduct = eDoc.mixProductId === WATER_PRODUCT_ID;
          const mixProduct: ProductSub = isWaterProduct
            ? (() => {
                const waterUnitConfig = buildWaterUnitConfig(equipment?.showFlOz ?? false);
                return {
                  ...waterProduct,
                  productCode: eDoc.equipmentId,
                  description: eDoc.equipmentId,
                  unitConfig: waterUnitConfig,
                  unitConfigDisplay: new UnitConfigDisplay(waterUnitConfig),
                };
              })()
            : (productSubsMap.get(eDoc.mixProductId) ?? baseProductSub);

          return {
            equipmentId: eDoc.equipmentId,
            appMethod,
            mixProductId: eDoc.mixProductId,
            mixProduct,
            mixProductUnitId: eDoc.mixProductUnitId,
            mixProductUnit: mixProduct.unit,
            plannedAmount: eDoc.plannedAmount,
            startAmount: eDoc.startAmount,
            finishAmount: eDoc.finishAmount,
            subProducts: eDoc.subProducts.map((sDoc) => {
              const sub = productSubsMap.get(sDoc.productId) ?? baseProductSub;
              return {
                productId: sDoc.productId,
                product: sub,
                plannedAmount: sDoc.plannedAmount,
                startAmount: sDoc.startAmount,
                finishAmount: sDoc.finishAmount,
                unitId: sDoc.unitId,
                unit: sub.unit,
              };
            }),
          };
        }),
        subProducts: masterDoc.subProducts.map((sDoc) => {
          const sub = productSubsMap.get(sDoc.productId) ?? baseProductSub;
          return {
            productId: sDoc.productId,
            product: sub,
            plannedAmount: sDoc.plannedAmount,
            startAmount: sDoc.startAmount,
            finishAmount: sDoc.finishAmount,
            unitId: sDoc.unitId,
            unit: sub.unit,
          };
        }),
      };
    }),
    singles: doc.singles.map((sDoc) => {
      const single = productSubsMap.get(sDoc.productId) ?? baseProductSub;
      return {
        productId: sDoc.productId,
        product: single as any,
        unitId: sDoc.unitId,
        unit: single.unit,
        startAmount: sDoc.startAmount,
        finishAmount: sDoc.finishAmount,
      };
    }),
    subProducts: doc.subProducts.map((sDoc) => {
      const sub = productSubsMap.get(sDoc.productId) ?? baseProductSub;
      return {
        productId: sDoc.productId,
        product: sub,
        unitId: sDoc.unitId,
        unit: sub.unit,
        startAmount: sDoc.startAmount,
        finishAmount: sDoc.finishAmount,
      };
    }),
  };
}
