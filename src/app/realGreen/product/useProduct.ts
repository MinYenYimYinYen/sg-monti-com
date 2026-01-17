import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import {
  productActions,
  productSelect,
} from "@/app/realGreen/product/productSlice";
import { realGreenConst } from "@/app/realGreen/lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";

export function useProduct({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const productMap = useSelector(productSelect.productMap);

  if (autoLoad) {
    dispatch(
      productActions.getProducts({
        showLoading: true,
        staleTime: realGreenConst.paramTypesCacheTime,
      }),
    );
  }

  const refresh = () =>
    dispatch(
      productActions.getProducts({
        showLoading: true,
        force: true,
      }),
    );

  const findProduct = (id: number) => productMap.get(id);
  const getProduct = (id: number) => {
    const product = productMap.get(id);
    if (!product) {
      throw new AppError({
        message: "Product not found",
        type: "VALIDATION_ERROR",
        isOperational: true,
        data: id,
      });
    }
    return product;
  };

  return { refresh, findProduct, getProduct };
}
