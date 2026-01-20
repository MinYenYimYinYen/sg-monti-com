import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import {
  priceTableActions,
  priceTableSelect,
} from "@/app/realGreen/priceTable/priceTableSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";

export function usePriceTable({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const priceTableMap = useSelector(priceTableSelect.priceTableMap);

  if (autoLoad) {
    dispatch(
      priceTableActions.getPriceTables({
        params: {},
        config: {
          loadingMsg: "Loading price tables...",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }

  const refresh = () =>
    dispatch(
      priceTableActions.getPriceTables({
        params: {},
        config: {
          loadingMsg: "Loading price tables...",
          force: true,
        },
      }),
    );

  const findPriceTable = (id: number) => priceTableMap.get(id);
  const getPriceTable = (id: number) => {
    const priceTable = priceTableMap.get(id);
    if (!priceTable) {
      throw new AppError({
        message: "PriceTable not found",
        type: "VALIDATION_ERROR",
        isOperational: true,
        data: id,
      });
    }
    return priceTable;
  };

  return { refresh, findPriceTable, getPriceTable };
}
