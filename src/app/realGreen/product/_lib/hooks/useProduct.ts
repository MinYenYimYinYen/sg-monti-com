import { productActions } from "@/app/realGreen/product/_lib/slices/productSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";
import { SubProductConfigDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

export function useProduct({ autoLoad }: { autoLoad?: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
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
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      productActions.getProducts({
        params: {},
        config: {
          loadingMsg: "Refreshing productDocs...",
          force: true,
        },
      }),
    );

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

  const updateUnit = (newUnit: Unit) => {
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
    subProductConfigs: SubProductConfigDoc[];
  }) => {
    const { masterId, subProductConfigs } = params;
    dispatch(
      productActions.updateMasterSubProducts({
        masterId,
        subProductConfigs,
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

  return {
    refresh,
    updateCategory,
    updateMasterSubProducts,
    updateUnit,
  };
}
