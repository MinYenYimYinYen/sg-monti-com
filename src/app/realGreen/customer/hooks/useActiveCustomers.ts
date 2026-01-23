import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, AppState } from "@/store";
import { useEffect } from "react";
import {
  activeCustomersActions,
  activeCustomersSelect,
} from "@/app/realGreen/customer/slices/activeCustomersSlice";

export function useActiveCustomers() {
  const dispatch = useDispatch<AppDispatch>();

  // Use the specific selector exported from the slice
  const services = useSelector((state: AppState) =>
    activeCustomersSelect.selectHydratedServices(state),
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
