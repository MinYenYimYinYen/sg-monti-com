import { printedCustomersActions } from "@/app/realGreen/customer/slices/printedCustomersSlice";
import { realGreenConst } from "../../_lib/realGreenConst";
import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { centralCustomerActions } from "@/app/realGreen/customer/slices/centralCustomerSlice";

export function usePrintedCustomers({ autoLoad }: { autoLoad?: boolean }) {
  const dispatch = useAppDispatch();

  // Set Context to Printed on Mount
  useEffect(() => {
    dispatch(centralCustomerActions.setCustomerContext("printed"));
    //todo: after I have selector for context made, this should only execute if
    // there's an actual change.
  }, [dispatch]);

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
