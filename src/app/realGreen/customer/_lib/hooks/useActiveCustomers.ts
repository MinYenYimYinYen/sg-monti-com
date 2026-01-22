import { AppDispatch } from "@/store";
import { useDispatch } from "react-redux";
import { activeCustomersActions } from "@/app/realGreen/customer/_lib/slices";
import { useCallback, useEffect } from "react";

export function useActiveCustomers({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

  const loadCustomers = useCallback(
    (force: boolean = false) => {
      dispatch(
        activeCustomersActions.activeCustomersSearch({
          params: { schemeName: "activeCustomers" },
          config: { loadingMsg: "Loading Customers", force },
        }),
      );
    },
    [dispatch],
  );

  useEffect(() => {
    if (autoLoad) loadCustomers();
  }, [autoLoad, loadCustomers]);

  const reload = () => loadCustomers(true);

  return { reload };
}
