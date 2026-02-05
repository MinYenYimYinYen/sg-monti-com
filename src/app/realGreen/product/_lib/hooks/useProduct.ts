import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { productActions } from "@/app/realGreen/product/_lib/slices/productSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useProductCategories } from "@/app/realGreen/product/_lib/hooks/useProductCategories";

export function useProduct({ autoLoad }: { autoLoad: boolean }) {
  useProductCategories({ autoLoad });
  const dispatch = useDispatch<AppDispatch>();

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

  return { refresh };
}
