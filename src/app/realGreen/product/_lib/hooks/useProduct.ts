import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { productActions } from "@/app/realGreen/product/_lib/slices/productSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";

export function useProduct({ autoLoad }: { autoLoad?: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

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

    dispatch(
      productActions.saveCategory({
        params: { categoryId, category: newCategory },
        config: {
          force: true,
          showLoading: false,
          successMsg: "Category saved successfully"
        },
      }),
    );
  };

  return { refresh, updateCategory };
}
