import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import {
  companyActions,
  companySelect,
} from "@/app/realGreen/company/companySlice";
import { realGreenConst } from "@/app/realGreen/lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";

export function useCompany({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const companyMap = useSelector(companySelect.companyMap);

  if (autoLoad) {
    dispatch(
      companyActions.getCompanies({
        showLoading: true,
        staleTime: realGreenConst.paramTypesCacheTime,
      }),
    );
  }

  const refresh = () =>
    dispatch(
      companyActions.getCompanies({
        showLoading: true,
        force: true,
      }),
    );

  const findCompany = (id: number) => companyMap.get(id);
  const getCompany = (id: number) => {
    const company = companyMap.get(id);
    if (!company) {
      throw new AppError({
        message: "Company not found",
        type: "VALIDATION_ERROR",
        isOperational: true,
        data: id,
      });
    }
    return company;
  };

  return { refresh, findCompany, getCompany };
}
