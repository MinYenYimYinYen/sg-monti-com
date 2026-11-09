import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { qboCustomerActions } from "@/app/qbo/customer/qboCustomerSlice";
import { qboConst } from "@/app/qbo/_lib/qboConst";

/** Loads customers when `autoLoad` is set (cached for the session) and exposes actions only. */
export function useQboCustomer({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        qboCustomerActions.getQboCustomers({
          params: {},
          config: {
            loadingMsg: "Loading QuickBooks customers...",
            staleTime: qboConst.referenceCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      qboCustomerActions.getQboCustomers({
        params: {},
        config: { loadingMsg: "Loading QuickBooks customers...", force: true },
      }),
    );

  return { refresh };
}
