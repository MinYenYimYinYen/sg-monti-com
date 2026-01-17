import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import {
  taxCodeActions,
  taxCodeSelect,
} from "@/app/realGreen/taxCode/taxCodeSlice";
import { realGreenConst } from "@/app/realGreen/lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";

export function useTaxCode({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const taxCodeMap = useSelector(taxCodeSelect.taxCodeMap);

  if (autoLoad) {
    dispatch(
      taxCodeActions.getTaxCodes({
        showLoading: true,
        staleTime: realGreenConst.paramTypesCacheTime,
      }),
    );
  }

  const refresh = () =>
    dispatch(
      taxCodeActions.getTaxCodes({
        showLoading: true,
        force: true,
      }),
    );

  const findTaxCode = (id: string) => taxCodeMap.get(id);
  const getTaxCode = (id: string) => {
    const taxCode = taxCodeMap.get(id);
    if (!taxCode) {
      throw new AppError({
        message: "TaxCode not found",
        type: "VALIDATION_ERROR",
        isOperational: true,
        data: id,
      });
    }
    return taxCode;
  };

  return { refresh, findTaxCode, getTaxCode };
}
