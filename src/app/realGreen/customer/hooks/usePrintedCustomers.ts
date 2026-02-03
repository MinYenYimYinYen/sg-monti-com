import { AppDispatch } from "@/store";
import { useDispatch } from "react-redux";
import { printedCustomersActions } from "@/app/realGreen/customer/slices/printedCustomersSlice";
import { realGreenConst } from "../../_lib/realGreenConst";
import { useCallback, useEffect } from "react";

export function usePrintedCustomers({ autoLoad }: { autoLoad?: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        printedCustomersActions.getCustDocs({
          params: {
            schemeName: "printedCustomers",
          },
          config: { staleTime: realGreenConst.paramTypesCacheTime },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = useCallback(() => {
    dispatch(
      printedCustomersActions.getCustDocs({
        params: {
          schemeName: "printedCustomers",
        },
        config: { staleTime: realGreenConst.paramTypesCacheTime, force: true },
      }),
    );
  }, [dispatch]);

  return { refresh };
}
