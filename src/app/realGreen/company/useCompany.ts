import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { companyActions } from "@/app/realGreen/company/companySlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";

export function useCompany({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        companyActions.getCompanies({
          params: {},
          config: {
            loadingMsg: "Loading companies...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      companyActions.getCompanies({
        params: {},
        config: { loadingMsg: "Loading companies...", force: true },
      }),
    );

  return { refresh };
}
