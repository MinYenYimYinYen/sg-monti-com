import { AppDispatch } from "@/store";
import { useDispatch } from "react-redux";
import { productCategoryActions } from "@/app/realGreen/product/_lib/slices/productCategorySlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useProductCategories({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  if (autoLoad) {
    dispatch(
      productCategoryActions.getProductCategories({
        params: {},
        config: {
          loadingMsg: "Loading product categories...",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }

  const refresh = () => {
    dispatch(
      productCategoryActions.getProductCategories({
        params: {},
        config: {
          loadingMsg: "Refreshing product categories...",
          force: true,
        },
      }),
    );
  };
  return { refresh };
}
