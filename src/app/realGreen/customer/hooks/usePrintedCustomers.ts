import { printedCustomersActions } from "@/app/realGreen/customer/slices/printedCustomersSlice";
import { realGreenConst } from "../../_lib/realGreenConst";
import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { centralCustomerActions } from "@/app/realGreen/customer/slices/centralCustomerSlice";
import { useSelector } from "react-redux";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";

export function usePrintedCustomers({ autoLoad }: { autoLoad?: boolean }) {
  const dispatch = useAppDispatch();
  const context = useSelector(centralSelect.context);

  useEffect(() => {
    if (context === "printed") return;
    dispatch(centralCustomerActions.setCustomerContext("printed"));
  }, [dispatch, context]);

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
