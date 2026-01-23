import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, AppState } from "@/store";
import { useEffect } from "react";
import { activeCustomersActions } from "@/app/realGreen/customer/slices/activeCustomersSlice";
import { selectContextServices } from "@/app/realGreen/customer/selectors/contextSelectors";

export function useActiveCustomers() {
  const dispatch = useDispatch<AppDispatch>();

  // Use the Context Selector to get fully hydrated services
  // We pass the 'activeCustomers' slice state to the selector
  const services = useSelector((state: AppState) =>
    selectContextServices(state.activeCustomers),
  );

  useEffect(() => {
    // Only fetch if we don't have data (simple check for now)
    if (services.length === 0) {
      dispatch(
        activeCustomersActions.getCustDocs({
          params: {
            schemeName: "activeCustomers",
          },
        }),
      );
    }
  }, [dispatch, services.length]);

  return {
    services,
  };
}
