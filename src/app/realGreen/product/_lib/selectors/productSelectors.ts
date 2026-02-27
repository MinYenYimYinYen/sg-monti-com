import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import {
  ProductMaster,
  SubProductConfig,
} from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductSubDoc } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { baseProductSub } from "@/app/realGreen/product/_lib/baseProduct";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { unitConfigSelect } from "@/app/realGreen/product/_lib/selectors/unitConfigSelectors";
import {
  baseProductUnitConfig,
  ProductUnitConfig,
  UnitConversion,
  UnitContext,
} from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

const selectProductMasterDocs = (state: AppState) =>
  state.product.productMasterDocs;
const selectProductSingleDocs = (state: AppState) =>
  state.product.productSingleDocs;

const selectProductMasterDocMap = createSelector(
  [selectProductMasterDocs],
  (masterDocs) => {
    return new Grouper(masterDocs).toUniqueMap((m) => m.productId);
  },
);

const selectProductSingleDocMap = createSelector(
  [selectProductSingleDocs],
  (singleDocs) => {
    return new Grouper(singleDocs).toUniqueMap((s) => s.productId);
  },
);

const selectProductSubDocs = (state: AppState) => state.product.productSubDocs;

const selectProductSubs = (state: AppState) =>
  selectProductSubDocs(state) as ProductSubDoc[];

const selectProductSubsMap = createSelector([selectProductSubs], (subs) => {
  return new Grouper(subs).toUniqueMap((s) => s.productId);
});

const selectProductMasters = createSelector(
  [selectProductMasterDocs, selectProductSubsMap],
  (masterDocs, subsMap) => {
    const masters: ProductMaster[] = masterDocs.map((doc) => {
      return {
        ...doc,
        subProductConfigs: doc.subProductConfigDocs.map((configDoc) => {
          const subProduct = subsMap.get(configDoc.subId);
          const config: SubProductConfig = {
            subId: configDoc.subId,
            rate: configDoc.rate,
            subProduct: subProduct || {
              ...baseProductSub,
              productId: configDoc.subId,
            },
          };
          return config;
        }),
      };
    });
    return masters;
  },
);

const selectProductSingles = createSelector(
  [selectProductSingleDocs],
  (singleDocs) => {
    const hydrated: ProductSingle[] = singleDocs.map((doc) => {
      return {
        ...doc,
        // unit: doc.unitId,
      };
    });
    return hydrated;
  },
);

const selectProductMastersMap = createSelector(
  [selectProductMasters],
  (masters) => {
    return new Grouper(masters).toUniqueMap((m) => m.productId);
  },
);

const selectProductSinglesMap = createSelector(
  [selectProductSingles],
  (singles) => {
    return new Grouper(singles).toUniqueMap((s) => s.productId);
  },
);

const selectProductCommonDocs = (state: AppState) =>
  state.product.productCommonDocs;

const selectProductCommonDocMap = createSelector(
  [selectProductCommonDocs],
  (commonDocs) => {
    return new Grouper(commonDocs).toUniqueMap((c) => c.productId);
  },
);

const selectProductCommons = createSelector(
  [selectProductCommonDocs, unitConfigSelect.unitConfigMap],
  (commonDocs, unitConfigMap) => {
    const productCommons: ProductCommon[] = commonDocs.map((doc) => {
      const storedUnitConfig = unitConfigMap.get(doc.productId);

      let unitConfig: ProductUnitConfig;

      if (storedUnitConfig) {
        // Config exists - check each context for defaults that need replacement

        const needsDefaults = (conversion: UnitConversion) =>
          conversion.unitLabel === baseStrId;

        const createRealConversion = (
          context: UnitContext,
        ): UnitConversion => ({
          context,
          unitLabel: doc.unit.desc,
          conversionFactor: 1,
          baseMetric: doc.unit.metric,
        });

        unitConfig = {
          ...storedUnitConfig,
          productId: doc.productId,
          conversions: {
            app: needsDefaults(storedUnitConfig.conversions.app)
              ? createRealConversion("app")
              : storedUnitConfig.conversions.app,
            load: needsDefaults(storedUnitConfig.conversions.load)
              ? createRealConversion("load")
              : storedUnitConfig.conversions.load,
            purchase: needsDefaults(storedUnitConfig.conversions.purchase)
              ? createRealConversion("purchase")
              : storedUnitConfig.conversions.purchase,
          },
        };
      } else {
        // No config exists - create all defaults from doc.unit
        const createRealConversion = (
          context: UnitContext,
        ): UnitConversion => ({
          context,
          unitLabel: doc.unit.desc,
          conversionFactor: 1,
          baseMetric: doc.unit.metric,
        });

        unitConfig = {
          productId: doc.productId,
          conversions: {
            app: createRealConversion("app"),
            load: createRealConversion("load"),
            purchase: createRealConversion("purchase"),
          },
        };
      }

      const productCommon: ProductCommon = {
        ...doc,
        unitConfig,
      };
      return productCommon;
    });
    return productCommons;
  },
);

const selectProductCommonMap = createSelector(
  [selectProductCommons],
  (productCommons) =>
    new Grouper(productCommons).toUniqueMap((c) => c.productId),
);

export const productSelect = {
  productMasterDocs: selectProductMasterDocs,
  productSingleDocs: selectProductSingleDocs,
  productMasterDocMap: selectProductMasterDocMap,
  productSingleDocMap: selectProductSingleDocMap,

  productMasters: selectProductMasters,
  productSingles: selectProductSingles,
  productSubs: selectProductSubs,
  productMastersMap: selectProductMastersMap,
  productSinglesMap: selectProductSinglesMap,
  productSubsMap: selectProductSubsMap,

  productCommonDocs: selectProductCommonDocs,
  productCommonDocMap: selectProductCommonDocMap,

  productCommons: selectProductCommons,
  productCommonMap: selectProductCommonMap,
};
