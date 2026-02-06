import { useSelector } from "react-redux";
import { AppState } from "@/store";
import { useEffect } from "react";
import {
  activeCustomersActions,
  activeCustomersSelect,
} from "@/app/realGreen/customer/slices/activeCustomersSlice";
import { useAppDispatch } from "@/lib/hooks/redux";
import { centralCustomerActions } from "@/app/realGreen/customer/slices/centralCustomerSlice";

export function useActiveCustomers() {
  const dispatch = useAppDispatch();

  // Use the specific selector exported from the slice
  const services = useSelector((state: AppState) =>
    activeCustomersSelect.services(state),
  );

  // Set Context to Active on Mount
  useEffect(() => {
    dispatch(centralCustomerActions.setCustomerContext("active"));
    //todo: after I have selector for context made, this should only execute if
    // there's an actual change.
  }, [dispatch]);

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
