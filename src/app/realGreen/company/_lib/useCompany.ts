import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import {
  companyActions,
} from "@/app/realGreen/company/_lib/companySlice";
import { realGreenConst } from "@/app/realGreen/lib/realGreenConst";

export function useCompany({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

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

  return { refresh };
}
