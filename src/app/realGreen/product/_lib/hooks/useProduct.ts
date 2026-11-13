import { productActions } from "@/app/realGreen/product/_lib/slices/productSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { SubProductConfigDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { useUnitConfig } from "@/app/realGreen/product/unitConfig/useUnitConfig";
import { appMethodActions } from "@/app/appMethod/appMethodSlice";
import { useAppMethod } from "@/app/appMethod/useAppMethod";

/** Which of the loads this hook fires the caller may make. Absent means allowed, so write-only callers and callers in other folders can skip it. */
export type ProductCanLoad = {
  products?: boolean;
  unitConversions?: boolean;
  appMethods?: boolean;
};

/**
 * Loads the products with the unit conversions and application methods they are shown with.
 *
 * `canLoad` comes from the component, because hooks expose actions only and do not select. A load
 * the user may not make is skipped, so a user holding part of what the product screens use gets no
 * refused request and no error toast.
 */
export function useProduct({
  autoLoad,
  canLoad = {},
}: {
  autoLoad?: boolean;
  canLoad?: ProductCanLoad;
}) {
  const {
    products: canLoadProducts = true,
    unitConversions: canLoadUnitConversions = true,
    appMethods: canLoadAppMethods = true,
  } = canLoad;
  const dispatch = useAppDispatch();
  // Every hook is always called, in the same order. A flag only turns its load off.
  useUnitConfig({ autoLoad, canLoad: canLoadUnitConversions });
  useAppMethod({ autoLoad, canLoad: canLoadAppMethods });

  useEffect(() => {
    if (autoLoad && canLoadProducts) {
      dispatch(
        productActions.getProducts({
          params: {},
          config: {
            loadingMsg: "Loading productDocs...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, canLoadProducts, dispatch]);

  const refresh = () => {
    if (!canLoadProducts) return;
    dispatch(
      productActions.getProducts({
        params: {},
        config: {
          loadingMsg: "Refreshing productDocs...",
          force: true,
        },
      }),
    );
  };

  const updateCategory = (categoryId: number, newCategory: string) => {
    dispatch(
      productActions.updateCategory({
        categoryId,
        newCategory,
      }),
    );

    return dispatch(
      productActions.saveCategory({
        params: { categoryId, category: newCategory },
        config: {
          force: true,
          showLoading: false,
        },
      }),
    ).unwrap();
  };

  const updateUnit = (newUnit: UnitCRM) => {
    dispatch(productActions.updateUnit({ newUnit }));

    return dispatch(
      productActions.saveUnit({
        params: { unit: newUnit },
        config: {
          force: true,
          showLoading: false,
        },
      }),
    ).unwrap();
  };

  const updateMasterSubProducts = (params: {
    masterId: number;
    subProductConfigDocs: SubProductConfigDoc[];
  }) => {
    const { masterId, subProductConfigDocs } = params;
    dispatch(
      productActions.updateMasterSubProducts({
        masterId,
        subProductConfigDocs,
      }),
    );

    return dispatch(
      productActions.saveMasterSubProducts({
        params,
        config: {
          force: true,
          showLoading: false,
        },
      }),
    ).unwrap();
  };

  const updateMasterEquipmentPackages = (params: {
    masterId: number;
    equipmentPackageIds: string[];
    defaultPackageId: string | null;
  }) => {
    const { masterId, equipmentPackageIds, defaultPackageId } = params;
    dispatch(
      productActions.updateMasterEquipmentPackages({
        masterId,
        equipmentPackageIds,
        defaultPackageId,
      }),
    );

    return dispatch(
      productActions.saveMasterEquipmentPackages({
        params: { masterId, equipmentPackageIds, defaultPackageId },
        config: {
          force: true,
          showLoading: false,
        },
      }),
    ).unwrap();
  };

  return {
    refresh,
    updateCategory,
    updateMasterSubProducts,
    updateMasterEquipmentPackages,
    updateUnit,
  };
}
